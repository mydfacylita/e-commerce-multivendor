'use client'

import { useState, useEffect } from 'react'
import { FiActivity, FiZap, FiAlertTriangle, FiCheckCircle, FiClock, FiDatabase, FiTrendingUp, FiShoppingCart } from 'react-icons/fi'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

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

interface RealtimeLog {
  id: string
  endpoint: string
  method: string
  duration: number
  statusCode: number
  timestamp: string
  bigO: string
}

interface TimeSeriesData {
  time: string
  duration: number
  calls: number
}

interface ChartData {
  timeSeries: TimeSeriesData[]
  complexityDistribution: { name: string; value: number; color: string }[]
  endpointVolume: { endpoint: string; calls: number }[]
  orderMetrics: {
    create: number
    read: number
    update: number
    avgTime: number
  }
}

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<APIMetric[]>([])
  const [realtimeLogs, setRealtimeLogs] = useState<RealtimeLog[]>([])
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'orders'>('overview')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    loadMetrics()
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 3000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, mounted])

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/admin/performance/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
        setRealtimeLogs(data.recentLogs)
        setChartData(data.charts)
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getComplexityColor = (complexity: string) => {
    const colors = {
      excellent: 'text-green-600 bg-green-100',
      good: 'text-blue-600 bg-blue-100',
      fair: 'text-yellow-600 bg-yellow-100',
      poor: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    }
    return colors[complexity as keyof typeof colors] || colors.fair
  }

  const getComplexityIcon = (complexity: string) => {
    if (complexity === 'excellent' || complexity === 'good') return <FiCheckCircle />
    if (complexity === 'fair') return <FiActivity />
    return <FiAlertTriangle />
  }

  const getBigOExplanation = (bigO: string) => {
    const explanations: Record<string, string> = {
      'O(1)': 'Constante - Excelente! Tempo fixo',
      'O(log n)': 'Logarítmica - Muito bom! Divide problema',
      'O(n)': 'Linear - Bom. Cresce com dados',
      'O(n log n)': 'Log-linear - Aceitável para ordenação',
      'O(n²)': 'Quadrática - ⚠️ Lento com muitos dados',
      'O(n³)': 'Cúbica - 🔥 Muito lento!',
      'O(2ⁿ)': 'Exponencial - 💥 CRÍTICO! Otimizar urgente',
      'O(n!)': 'Fatorial - 🚨 EXTREMAMENTE LENTO!'
    }
    return explanations[bigO] || 'Complexidade desconhecida'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FiActivity className="animate-spin text-4xl text-primary-600 mx-auto mb-4" />
          <p>Analisando APIs...</p>
        </div>
      </div>
    )
  }

  const criticalEndpoints = metrics.filter(m => m.complexity === 'critical' || m.complexity === 'poor')
  const avgResponseTime = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + m.avgDuration, 0) / metrics.length)
    : 0

  const orderMetrics = metrics.filter(m => m.endpoint.includes('/orders'))

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FiActivity className="animate-spin text-4xl text-primary-600 mx-auto mb-4" />
          <p>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Performance Dashboard</h1>
          <p className="text-gray-600 mt-1">Análise em tempo real com Big O</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              autoRefresh 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={loadMetrics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Atualizar Agora
          </button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-2 font-medium ${
            selectedTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          <FiActivity className="inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setSelectedTab('orders')}
          className={`px-4 py-2 font-medium ${
            selectedTab === 'orders'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          <FiShoppingCart className="inline mr-2" />
          Orders API
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tempo Médio</p>
              <p className="text-3xl font-bold text-blue-600">{avgResponseTime}ms</p>
            </div>
            <FiClock className="text-4xl text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total APIs</p>
              <p className="text-3xl font-bold text-gray-800">{metrics.length}</p>
            </div>
            <FiZap className="text-4xl text-gray-800" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Críticos</p>
              <p className="text-3xl font-bold text-red-600">{criticalEndpoints.length}</p>
            </div>
            <FiAlertTriangle className="text-4xl text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Chamadas</p>
              <p className="text-3xl font-bold text-green-600">
                {metrics.reduce((sum, m) => sum + m.totalCalls, 0)}
              </p>
            </div>
            <FiTrendingUp className="text-4xl text-green-600" />
          </div>
        </div>
      </div>

      {criticalEndpoints.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <FiAlertTriangle className="text-red-600 mr-3 text-xl" />
            <div>
              <p className="font-bold text-red-800">Atenção! {criticalEndpoints.length} endpoint(s) com problemas de performance</p>
              <p className="text-red-700 text-sm">
                Endpoints: {criticalEndpoints.map(e => e.endpoint).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">Tempo de Resposta (24h)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.timeSeries}>
                <defs>
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorDuration)" 
                  name="Duração (ms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">Distribuição Big O</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.complexityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.complexityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
            <h3 className="text-lg font-bold mb-4">Volume por Endpoint (Top 10)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.endpointVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="endpoint" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="calls" fill="#10b981" name="Chamadas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedTab === 'orders' && chartData && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">
            <FiShoppingCart className="inline mr-2" />
            Métricas de Orders API
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-gray-600">Create Orders (POST)</p>
              <p className="text-2xl font-bold text-green-600">{chartData.orderMetrics.create}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600">Read Orders (GET)</p>
              <p className="text-2xl font-bold text-blue-600">{chartData.orderMetrics.read}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <p className="text-sm text-gray-600">Update Orders (PUT/PATCH)</p>
              <p className="text-2xl font-bold text-yellow-600">{chartData.orderMetrics.update}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <p className="text-sm text-gray-600">Tempo Médio</p>
              <p className="text-2xl font-bold text-purple-600">{chartData.orderMetrics.avgTime.toFixed(0)}ms</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {selectedTab === 'overview' ? 'Todas as APIs' : 'Orders API - Análise Detalhada'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Big O</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queries DB</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tempo Médio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Chamadas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxa Erro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(selectedTab === 'overview' ? metrics : orderMetrics).map((metric, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.endpoint}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        metric.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                        metric.method === 'POST' ? 'bg-green-100 text-green-800' :
                        metric.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {metric.method}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-bold text-purple-600" title={getBigOExplanation(metric.bigO)}>
                        {metric.bigO}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FiDatabase className="mr-2" />
                        {metric.queryCount}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.avgDuration.toFixed(0)}ms
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.totalCalls}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`${metric.errorRate > 5 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                        {metric.errorRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getComplexityColor(metric.complexity)}`}>
                        {getComplexityIcon(metric.complexity)}
                        {metric.complexity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Logs em Tempo Real</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {realtimeLogs.map((log, index) => {
            const logTime = new Date(log.timestamp).toLocaleTimeString('pt-BR')
            return (
              <div key={index} className="mb-2 border-b border-gray-700 pb-2">
                <span className="text-gray-500">[{logTime}]</span>{' '}
                <span className={`${log.statusCode >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                  {log.method}
                </span>{' '}
                <span className="text-blue-400">{log.endpoint}</span>{' '}
                <span className="text-yellow-400">{log.duration}ms</span>{' '}
                <span className="text-purple-400">{log.bigO}</span>{' '}
                <span className={`${log.statusCode >= 400 ? 'text-red-400' : 'text-gray-500'}`}>
                  [{log.statusCode}]
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-bold text-blue-800 mb-2">Guia de Otimização</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>O(n²) ou pior</strong>: Verifique N+1 queries. Use includes/select no Prisma.</li>
          <li>• <strong>Alta latência</strong>: Adicione índices no banco ou cache Redis.</li>
          <li>• <strong>Muitas queries</strong>: Consolide com joins ou batch operations.</li>
          <li>• <strong>Taxa de erro alta</strong>: Verifique validações e logs de erro.</li>
        </ul>
      </div>
    </div>
  )
}
