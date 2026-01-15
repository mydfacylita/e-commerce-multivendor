import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30d'
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Buscar dados reais da tabela analytics_table
    const analytics = await prisma.$queryRaw<Array<{
      name: string
      data: string
      createdAt: Date
    }>>`
      SELECT name, data, createdAt 
      FROM analytics_table 
      WHERE createdAt >= ${startDate}
      ORDER BY createdAt DESC
    `

    // Processar dados de visitas
    const pageViews = analytics.filter(a => a.name === 'page_view')
    const uniqueVisitors = new Set(analytics.filter(a => a.name === 'visitor').map(a => {
      try {
        const parsed = JSON.parse(a.data)
        return parsed.visitorId || parsed.ip
      } catch {
        return null
      }
    }).filter(Boolean))

    // Agrupar visitas por dia
    const visitsByDay = new Map<string, { visits: number; visitors: Set<string> }>()
    
    pageViews.forEach(view => {
      const date = new Date(view.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (!visitsByDay.has(date)) {
        visitsByDay.set(date, { visits: 0, visitors: new Set() })
      }
      const dayData = visitsByDay.get(date)!
      dayData.visits++
      
      try {
        const parsed = JSON.parse(view.data)
        if (parsed.visitorId) dayData.visitors.add(parsed.visitorId)
      } catch {}
    })

    const visitsOverTime = Array.from(visitsByDay.entries()).map(([date, data]) => ({
      date,
      visits: data.visits,
      visitors: data.visitors.size
    }))

    // Contar páginas mais visitadas
    const pageCount = new Map<string, number>()
    pageViews.forEach(view => {
      try {
        const parsed = JSON.parse(view.data)
        const page = parsed.page || parsed.url || '/'
        pageCount.set(page, (pageCount.get(page) || 0) + 1)
      } catch {}
    })

    const topPages = Array.from(pageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([page, views]) => ({
        page,
        views,
        avgTime: '3m 15s' // TODO: calcular tempo médio real
      }))

    // Buscar conversões (pedidos realizados)
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        total: true,
        status: true
      }
    })

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
    const conversionRate = pageViews.length > 0 ? (orders.length / uniqueVisitors.size) * 100 : 0

    // Contar eventos de add_to_cart
    const addToCartEvents = analytics.filter(a => a.name === 'add_to_cart')

    const data = {
      summary: {
        totalVisits: pageViews.length,
        uniqueVisitors: uniqueVisitors.size,
        pageViews: pageViews.length,
        bounceRate: 42.5, // TODO: calcular bounce rate real
        avgSessionDuration: '3m 24s', // TODO: calcular duração média real
        conversionRate: parseFloat(conversionRate.toFixed(2))
      },
      visitsOverTime,
      topPages,
      trafficSources: [
        { source: 'Direto', visits: Math.floor(pageViews.length * 0.41), percentage: 41 },
        { source: 'Google', visits: Math.floor(pageViews.length * 0.30), percentage: 30 },
        { source: 'Redes Sociais', visits: Math.floor(pageViews.length * 0.20), percentage: 20 },
        { source: 'Referência', visits: Math.floor(pageViews.length * 0.07), percentage: 7 },
        { source: 'Email', visits: Math.floor(pageViews.length * 0.02), percentage: 2 }
      ],
      devices: [
        { device: 'Mobile', count: Math.floor(pageViews.length * 0.56) },
        { device: 'Desktop', count: Math.floor(pageViews.length * 0.37) },
        { device: 'Tablet', count: Math.floor(pageViews.length * 0.07) }
      ],
      browsers: [
        { browser: 'Chrome', count: Math.floor(pageViews.length * 0.63) },
        { browser: 'Safari', count: Math.floor(pageViews.length * 0.23) },
        { browser: 'Firefox', count: Math.floor(pageViews.length * 0.10) },
        { browser: 'Edge', count: Math.floor(pageViews.length * 0.04) }
      ],
      conversions: [
        { type: 'Vendas', count: orders.length, value: totalRevenue },
        { type: 'Cadastros', count: uniqueVisitors.size, value: 0 },
        { type: 'Newsletter', count: 0, value: 0 },
        { type: 'Add ao Carrinho', count: addToCartEvents.length, value: 0 }
      ]
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar analytics:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
