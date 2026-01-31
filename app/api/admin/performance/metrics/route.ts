import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface APIMetric {
  endpoint: string
  method: string
  avgDuration: number
  totalCalls: number
  bigO: string
  complexity: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  queryCount: number
  lastCalled: string
  errorRate: number
}

/**
 * Analisa a complexidade Big O baseado em:
 * - Número de queries
 * - Tempo de resposta
 * - Padrões de código (loops, joins, etc)
 */
function analyzeBigO(endpoint: string, avgDuration: number, queryCount: number): {
  bigO: string
  complexity: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
} {
  // Análise baseada em queries e tempo
  let bigO = 'O(1)'
  let complexity: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'excellent'

  // O(1) - Constante: 1 query, rápido
  if (queryCount === 1 && avgDuration < 50) {
    bigO = 'O(1)'
    complexity = 'excellent'
  }
  // O(log n) - Logarítmica: Busca com índice, binária
  else if (queryCount === 1 && avgDuration < 200 && endpoint.includes('findUnique')) {
    bigO = 'O(log n)'
    complexity = 'excellent'
  }
  // O(n) - Linear: Uma query, tempo proporcional
  else if (queryCount <= 2 && avgDuration < 500) {
    bigO = 'O(n)'
    complexity = 'good'
  }
  // O(n log n) - Log-linear: Ordenação, múltiplas queries com índice
  else if (queryCount <= 5 && avgDuration < 1000) {
    bigO = 'O(n log n)'
    complexity = 'fair'
  }
  // O(n²) - Quadrática: Loop dentro de loop, N+1 problem
  else if (queryCount > 10 || avgDuration > 1000) {
    bigO = 'O(n²)'
    complexity = 'poor'
  }
  // O(2ⁿ) ou pior - Exponencial/Fatorial
  else if (queryCount > 50 || avgDuration > 5000) {
    bigO = 'O(2ⁿ)'
    complexity = 'critical'
  }

  // Casos especiais baseados no endpoint
  if (endpoint.includes('/products') && !endpoint.includes('[id]')) {
    // Lista de produtos sem paginação pode ser O(n)
    if (queryCount > 5) {
      bigO = 'O(n²)' // N+1 problem provável
      complexity = 'poor'
    }
  }

  if (endpoint.includes('/search') || endpoint.includes('/filter')) {
    // Buscas complexas
    if (avgDuration > 2000) {
      bigO = 'O(n log n)'
      complexity = 'fair'
    }
  }

  return { bigO, complexity }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    // Buscar logs dos últimos 5 minutos para análise em tempo real
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const recentLogs = await prisma.apiLog.findMany({
      where: {
        createdAt: {
          gte: fiveMinutesAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      select: {
        id: true,
        method: true,
        endpoint: true,
        statusCode: true,
        duration: true,
        createdAt: true
      }
    })

    // Agregar métricas por endpoint
    const metricsMap = new Map<string, {
      endpoint: string
      method: string
      durations: number[]
      statusCodes: number[]
      queryCounts: number[]
      lastCalled: Date
    }>()

    // Buscar todos os logs para análise completa (últimas 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const allLogs = await prisma.apiLog.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      },
      select: {
        method: true,
        endpoint: true,
        statusCode: true,
        duration: true,
        createdAt: true
      }
    })

    // Agrupar dados por endpoint
    for (const log of allLogs) {
      const key = `${log.method} ${log.endpoint}`
      
      if (!metricsMap.has(key)) {
        metricsMap.set(key, {
          endpoint: log.endpoint,
          method: log.method,
          durations: [],
          statusCodes: [],
          queryCounts: [],
          lastCalled: log.createdAt
        })
      }

      const data = metricsMap.get(key)!
      data.durations.push(log.duration || 0)
      data.statusCodes.push(log.statusCode)
      
      // Estimar query count baseado no tempo (heurística)
      const estimatedQueries = Math.ceil((log.duration || 100) / 50)
      data.queryCounts.push(estimatedQueries)
      
      if (log.createdAt > data.lastCalled) {
        data.lastCalled = log.createdAt
      }
    }

    // Calcular métricas e Big O para cada endpoint
    const metrics: APIMetric[] = []

    for (const [key, data] of metricsMap.entries()) {
      const avgDuration = data.durations.reduce((a, b) => a + b, 0) / data.durations.length
      const avgQueryCount = Math.round(
        data.queryCounts.reduce((a, b) => a + b, 0) / data.queryCounts.length
      )
      const errorCount = data.statusCodes.filter(code => code >= 400).length
      const errorRate = (errorCount / data.statusCodes.length) * 100

      const { bigO, complexity } = analyzeBigO(data.endpoint, avgDuration, avgQueryCount)

      metrics.push({
        endpoint: data.endpoint,
        method: data.method,
        avgDuration: Math.round(avgDuration),
        totalCalls: data.durations.length,
        bigO,
        complexity,
        queryCount: avgQueryCount,
        lastCalled: data.lastCalled.toISOString(),
        errorRate
      })
    }

    // Ordenar por complexidade (piores primeiro)
    const complexityOrder = { critical: 5, poor: 4, fair: 3, good: 2, excellent: 1 }
    metrics.sort((a, b) => 
      complexityOrder[b.complexity] - complexityOrder[a.complexity] ||
      b.avgDuration - a.avgDuration
    )

    // Formatar logs recentes com Big O
    const formattedRecentLogs = recentLogs.map(log => {
      const estimatedQueries = Math.ceil((log.duration || 100) / 50)
      const { bigO } = analyzeBigO(log.endpoint, log.duration || 0, estimatedQueries)
      
      return {
        id: log.id,
        endpoint: log.endpoint,
        method: log.method,
        duration: log.duration || 0,
        statusCode: log.statusCode,
        timestamp: log.createdAt.toISOString(),
        bigO
      }
    })

    // Gerar dados para gráficos
    
    // 1. Série temporal (últimas 24h agrupadas por hora)
    const timeSeriesMap = new Map<string, { duration: number[]; calls: number }>()
    for (const log of allLogs) {
      const hour = new Date(log.createdAt).toISOString().slice(0, 13) + ':00'
      if (!timeSeriesMap.has(hour)) {
        timeSeriesMap.set(hour, { duration: [], calls: 0 })
      }
      const data = timeSeriesMap.get(hour)!
      data.duration.push(log.duration || 0)
      data.calls++
    }

    const timeSeries = Array.from(timeSeriesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-24) // últimas 24 horas
      .map(([time, data]) => ({
        time: new Date(time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        duration: Math.round(data.duration.reduce((a, b) => a + b, 0) / data.duration.length),
        calls: data.calls
      }))

    // 2. Distribuição de complexidade
    const complexityCount = new Map<string, number>()
    for (const metric of metrics) {
      const count = complexityCount.get(metric.bigO) || 0
      complexityCount.set(metric.bigO, count + 1)
    }

    const complexityColors: Record<string, string> = {
      'O(1)': '#10b981',
      'O(log n)': '#3b82f6',
      'O(n)': '#f59e0b',
      'O(n log n)': '#f97316',
      'O(n²)': '#ef4444',
      'O(2ⁿ)': '#dc2626',
      'O(n!)': '#991b1b'
    }

    const complexityDistribution = Array.from(complexityCount.entries()).map(([name, value]) => ({
      name,
      value,
      color: complexityColors[name] || '#6b7280'
    }))

    // 3. Volume por endpoint (top 10)
    const endpointVolume = metrics
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 10)
      .map(m => ({
        endpoint: `${m.method} ${m.endpoint.slice(0, 30)}${m.endpoint.length > 30 ? '...' : ''}`,
        calls: m.totalCalls
      }))

    // 4. Métricas específicas de Orders
    const orderMetrics = {
      create: metrics.find(m => m.endpoint.includes('/orders') && m.method === 'POST')?.totalCalls || 0,
      read: metrics.filter(m => m.endpoint.includes('/orders') && m.method === 'GET').reduce((sum, m) => sum + m.totalCalls, 0),
      update: metrics.filter(m => m.endpoint.includes('/orders') && (m.method === 'PUT' || m.method === 'PATCH')).reduce((sum, m) => sum + m.totalCalls, 0),
      avgTime: Math.round(
        metrics
          .filter(m => m.endpoint.includes('/orders'))
          .reduce((sum, m) => sum + m.avgDuration, 0) / 
        (metrics.filter(m => m.endpoint.includes('/orders')).length || 1)
      )
    }

    return NextResponse.json({
      metrics,
      recentLogs: formattedRecentLogs,
      charts: {
        timeSeries,
        complexityDistribution,
        endpointVolume,
        orderMetrics
      },
      summary: {
        totalEndpoints: metrics.length,
        criticalCount: metrics.filter(m => m.complexity === 'critical').length,
        poorCount: metrics.filter(m => m.complexity === 'poor').length,
        avgResponseTime: Math.round(
          metrics.reduce((sum, m) => sum + m.avgDuration, 0) / metrics.length
        )
      }
    })
  } catch (error) {
    console.error('Erro ao calcular métricas:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular métricas' },
      { status: 500 }
    )
  }
}
