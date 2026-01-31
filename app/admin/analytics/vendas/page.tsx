'use client'

import { useState, useEffect } from 'react'
import { FiDollarSign, FiShoppingCart, FiUsers, FiTrendingUp, FiPackage, FiRefreshCw, FiMaximize, FiMinimize } from 'react-icons/fi'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface SalesData {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  averageTicket: number
  revenueGrowth: number
  ordersGrowth: number
  revenueByDay: { date: string; value: number }[]
  ordersByStatus: { status: string; count: number; color: string }[]
  topProducts: { name: string; sales: number; revenue: number }[]
}

export default function VendasDashboardTV() {
  const [data, setData] = useState<SalesData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    const elem = document.getElementById('dashboard-container')
    if (!elem) return

    if (!document.fullscreenElement) {
      elem.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      loadData()
    }, 30000) // Atualiza a cada 30 segundos

    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true) // Mostra que está atualizando
      const response = await fetch('/api/admin/analytics/vendas', {
        credentials: 'include', // Garante que os cookies sejam enviados
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Não autorizado - faça login como ADMIN')
          window.location.href = '/login'
          return
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <FiRefreshCw className="animate-spin text-6xl text-white mx-auto mb-4" />
          <p className="text-white text-2xl">Carregando dados...</p>
        </div>
      </div>
    )
  }

  const revenueChartData = {
    labels: data.revenueByDay.map(d => {
      const date = new Date(d.date)
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    }),
    datasets: [
      {
        label: 'Receita',
        data: data.revenueByDay.map(d => d.value),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        fill: true,
        tension: 0.4,
        borderWidth: 3
      }
    ]
  }

  const orderStatusData = {
    labels: data.ordersByStatus.map(s => s.status),
    datasets: [
      {
        data: data.ordersByStatus.map(s => s.count),
        backgroundColor: data.ordersByStatus.map(s => s.color),
        borderWidth: 0
      }
    ]
  }

  const topProductsData = {
    labels: data.topProducts.map(p => p.name.substring(0, 25)),
    datasets: [
      {
        label: 'Vendas',
        data: data.topProducts.map(p => p.sales),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }
    ]
  }

  return (
    <div id="dashboard-container" className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-1">Dashboard de Vendas</h1>
          <p className="text-gray-400 text-lg">Tempo real - Últimos 30 dias</p>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <FiMinimize className="text-2xl" /> : <FiMaximize className="text-2xl" />}
          </button>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Última atualização</p>
            <p className="text-white text-xl font-mono">
              {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
            <div className="flex items-center justify-end mt-1">
              {isLoading ? (
                <>
                  <FiRefreshCw className="animate-spin text-blue-400 mr-2" />
                  <span className="text-sm text-blue-400">Atualizando...</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm text-green-400">Ao vivo</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <FiDollarSign className="text-4xl text-white opacity-80" />
            <div className={`flex items-center text-white ${data.revenueGrowth >= 0 ? '' : 'opacity-70'}`}>
              <FiTrendingUp className="mr-1" />
              <span className="text-sm">{data.revenueGrowth > 0 ? '+' : ''}{data.revenueGrowth.toFixed(1)}%</span>
            </div>
          </div>
          <p className="text-white text-sm opacity-90 mb-1">Receita Total</p>
          <p className="text-white text-3xl font-bold">
            {data.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <FiShoppingCart className="text-4xl text-white opacity-80" />
            <div className={`flex items-center text-white ${data.ordersGrowth >= 0 ? '' : 'opacity-70'}`}>
              <FiTrendingUp className="mr-1" />
              <span className="text-sm">{data.ordersGrowth > 0 ? '+' : ''}{data.ordersGrowth.toFixed(1)}%</span>
            </div>
          </div>
          <p className="text-white text-sm opacity-90 mb-1">Pedidos</p>
          <p className="text-white text-3xl font-bold">{data.totalOrders}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <FiUsers className="text-4xl text-white opacity-80" />
          </div>
          <p className="text-white text-sm opacity-90 mb-1">Clientes</p>
          <p className="text-white text-3xl font-bold">{data.totalCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <FiPackage className="text-4xl text-white opacity-80" />
          </div>
          <p className="text-white text-sm opacity-90 mb-1">Ticket Médio</p>
          <p className="text-white text-3xl font-bold">
            {data.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-3 gap-4 flex-1">
        {/* Receita ao Longo do Tempo */}
        <div className="col-span-2 bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-2xl flex flex-col">
          <h2 className="text-xl font-bold text-white mb-2">Receita dos Últimos Dias</h2>
          <div className="flex-1">
            <Line 
              data={revenueChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    padding: 12,
                    titleFont: { size: 16 },
                    bodyFont: { size: 14 }
                  }
                },
                scales: {
                  x: {
                    ticks: { color: 'white', font: { size: 14 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { 
                      color: 'white',
                      font: { size: 14 },
                      callback: (value) => `R$ ${value}`
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Status dos Pedidos */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-2xl flex flex-col">
          <h2 className="text-xl font-bold text-white mb-2">Status dos Pedidos</h2>
          <div className="flex-1 flex items-center justify-center">
            <Doughnut 
              data={orderStatusData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: 'white',
                      font: { size: 14 },
                      padding: 15
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 16 },
                    bodyFont: { size: 14 }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Top Produtos */}
        <div className="col-span-3 bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Top 5 Produtos Mais Vendidos</h2>
          <div className="h-40">
            <Bar 
              data={topProductsData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 16 },
                    bodyFont: { size: 14 }
                  }
                },
                scales: {
                  x: {
                    ticks: { color: 'white', font: { size: 14 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                  },
                  y: {
                    ticks: { color: 'white', font: { size: 14 } },
                    grid: { display: false }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
