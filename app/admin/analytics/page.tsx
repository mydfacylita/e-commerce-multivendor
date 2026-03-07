'use client'

import { useState, useEffect } from 'react'
import { FiUsers, FiEye, FiMousePointer, FiTrendingUp, FiMonitor, FiSmartphone, FiGlobe, FiClock } from 'react-icons/fi'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface AnalyticsData {
  summary: {
    totalVisits: number
    uniqueVisitors: number
    pageViews: number
    bounceRate: number
    avgSessionDuration: string
    conversionRate: number
  }
  visitsOverTime: Array<{ date: string; visits: number; visitors: number }>
  topPages: Array<{ page: string; views: number; avgTime: string }>
  trafficSources: Array<{ source: string; visits: number; percentage: number }>
  devices: Array<{ device: string; count: number }>
  browsers: Array<{ browser: string; count: number }>
  conversions: Array<{ type: string; count: number; value: number }>
  topProducts: Array<{ id: string; name: string; slug: string; image: string; price: number; category: string; views: number }>
  topProductsUnique: Array<{ id: string; name: string; slug: string; image: string; price: number; category: string; uniqueVisitors: number }>
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FiTrendingUp className="animate-spin text-4xl text-primary-600 mx-auto mb-4" />
          <p>Carregando analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Erro ao carregar dados de analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics do Site</h1>
          <p className="text-gray-600 mt-1">Monitore o desempenho e comportamento dos visitantes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === '7d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === '30d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            30 dias
          </button>
          <button
            onClick={() => setPeriod('90d')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === '90d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            90 dias
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <FiEye className="text-2xl text-blue-600" />
            <span className="text-xs text-green-600 font-semibold">+12%</span>
          </div>
          <p className="text-sm text-gray-600">Total de Visitas</p>
          <p className="text-2xl font-bold text-gray-800">{data.summary.totalVisits.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <FiUsers className="text-2xl text-green-600" />
            <span className="text-xs text-green-600 font-semibold">+8%</span>
          </div>
          <p className="text-sm text-gray-600">Visitantes Únicos</p>
          <p className="text-2xl font-bold text-gray-800">{data.summary.uniqueVisitors.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <FiMousePointer className="text-2xl text-purple-600" />
            <span className="text-xs text-green-600 font-semibold">+15%</span>
          </div>
          <p className="text-sm text-gray-600">Páginas Vistas</p>
          <p className="text-2xl font-bold text-gray-800">{data.summary.pageViews.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <FiTrendingUp className="text-2xl text-orange-600" />
            <span className="text-xs text-red-600 font-semibold">-2%</span>
          </div>
          <p className="text-sm text-gray-600">Taxa de Rejeição</p>
          <p className="text-2xl font-bold text-gray-800">{data.summary.bounceRate}%</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <FiClock className="text-2xl text-cyan-600" />
            <span className="text-xs text-green-600 font-semibold">+5%</span>
          </div>
          <p className="text-sm text-gray-600">Tempo Médio</p>
          <p className="text-2xl font-bold text-gray-800">{data.summary.avgSessionDuration}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <FiTrendingUp className="text-2xl text-pink-600" />
            <span className="text-xs text-green-600 font-semibold">+18%</span>
          </div>
          <p className="text-sm text-gray-600">Taxa Conversão</p>
          <p className="text-2xl font-bold text-gray-800">{data.summary.conversionRate}%</p>
        </div>
      </div>

      {/* Gráfico de Visitas ao Longo do Tempo */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Visitas ao Longo do Tempo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.visitsOverTime}>
            <defs>
              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="visits" 
              stroke="#3B82F6" 
              fillOpacity={1} 
              fill="url(#colorVisits)" 
              name="Visitas"
            />
            <Area 
              type="monotone" 
              dataKey="visitors" 
              stroke="#10B981" 
              fillOpacity={1} 
              fill="url(#colorVisitors)" 
              name="Visitantes"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Páginas Mais Visitadas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Páginas Mais Visitadas</h3>
          <div className="space-y-3">
            {data.topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{page.page}</p>
                  <p className="text-xs text-gray-500">Tempo médio: {page.avgTime}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{page.views.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">visualizações</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Origem do Tráfego */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Origem do Tráfego</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.trafficSources}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="visits"
              >
                {data.trafficSources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {data.trafficSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-700">{source.source}</span>
                </div>
                <span className="font-semibold text-gray-800">{source.visits.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispositivos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Dispositivos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.devices}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="device" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" name="Acessos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Navegadores */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Navegadores</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.browsers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="browser" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" name="Acessos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversões */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Conversões</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {data.conversions.map((conversion, index) => (
            <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{conversion.type}</p>
              <p className="text-2xl font-bold text-gray-800 mb-1">{conversion.count}</p>
              <p className="text-sm text-green-600 font-semibold">
                R$ {conversion.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 50 Produtos Mais Visualizados */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Top 50 Produtos Mais Visualizados</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Período: {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
          </span>
        </div>
        {data.topProducts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum produto visualizado neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="text-left py-3 px-2 w-10">#</th>
                  <th className="text-left py-3 px-2">Produto</th>
                  <th className="text-left py-3 px-2 hidden md:table-cell">Categoria</th>
                  <th className="text-right py-3 px-2">Preço</th>
                  <th className="text-right py-3 px-2">Visualizações</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product, index) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-300 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0" />
                        )}
                        <a
                          href={`/produtos/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-800 font-medium hover:text-blue-600 transition line-clamp-2"
                        >
                          {product.name}
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {product.category || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700 font-medium whitespace-nowrap">
                      R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-bold text-blue-600">{product.views.toLocaleString()}</span>
                      <span className="block text-xs text-gray-400">views</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Top 50 Produtos por Visitantes Únicos Reais */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Top 50 Produtos — Visitantes Únicos</h3>
            <p className="text-sm text-gray-500 mt-0.5">Pessoas reais que acessaram o produto (sem bots ou repetições)</p>
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Período: {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
          </span>
        </div>
        {!data.topProductsUnique || data.topProductsUnique.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum dado de visitante único neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="text-left py-3 px-2 w-10">#</th>
                  <th className="text-left py-3 px-2">Produto</th>
                  <th className="text-left py-3 px-2 hidden md:table-cell">Categoria</th>
                  <th className="text-right py-3 px-2">Preço</th>
                  <th className="text-right py-3 px-2">Visitantes Únicos</th>
                </tr>
              </thead>
              <tbody>
                {data.topProductsUnique.map((product, index) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-300 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0" />
                        )}
                        <a
                          href={`/produtos/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-800 font-medium hover:text-blue-600 transition line-clamp-2"
                        >
                          {product.name}
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {product.category || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700 font-medium whitespace-nowrap">
                      R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-bold text-emerald-600">{product.uniqueVisitors.toLocaleString()}</span>
                      <span className="block text-xs text-gray-400">únicos</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
