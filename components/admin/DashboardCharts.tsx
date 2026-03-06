'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  FiShoppingBag, FiUsers, FiDollarSign, FiPackage,
  FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw,
  FiClock, FiStar, FiShoppingCart, FiCreditCard, FiArrowUpRight, FiArrowDownRight
} from 'react-icons/fi'

interface DashboardData {
  kpis: {
    totalProducts: number
    activeProducts: number
    totalOrders: number
    totalUsers: number
    totalSellers: number
    activeSellers: number
    pendingSellers: number
    totalRevenue: number
    revenueThisMonth: number
    revenueLastMonth: number
    revenueChange: number
    ordersThisMonth: number
    ordersLastMonth: number
    ordersChange: number
    ordersToday: number
    pendingOrders: number
    processingOrders: number
    newUsersThisWeek: number
    activeSubscriptions: number
    expiredSubscriptions: number
  }
  ordersByStatus: { status: string; count: number }[]
  revenueByDay: { date: string; label: string; receita: number; pedidos: number }[]
  topProducts: { id: string; name: string; vendas: number; receita: number }[]
  topSellers: { id: string; nome: string; receita: number; pedidos: number; comissao: number }[]
  paymentMethods: { method: string; count: number; total: number }[]
  recentOrders: {
    id: string; buyerName: string; total: number; status: string;
    paymentMethod: string | null; createdAt: string
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  PROCESSING: '#3B82F6',
  SHIPPED: '#8B5CF6',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
}
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}
const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function KPICard({
  title, value, sub, icon: Icon, color, change, changeLabel, alert
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  change?: number
  changeLabel?: string
  alert?: boolean
}) {
  const up = (change ?? 0) >= 0
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-3 ${alert ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${alert ? 'bg-red-50' : 'bg-gray-50'}`}>
          <Icon size={20} className={alert ? 'text-red-500' : color} />
        </div>
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1 text-xs">
          {up ? <FiArrowUpRight className="text-green-500" /> : <FiArrowDownRight className="text-red-500" />}
          <span className={up ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            {up ? '+' : ''}{change}%
          </span>
          <span className="text-gray-400">{changeLabel || 'vs mês anterior'}</span>
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {p.name === 'receita' ? fmt(p.value) : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardCharts() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'sellers'>('overview')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const json = await res.json()
      setData(json)
      setLastUpdate(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <FiRefreshCw size={32} className="animate-spin" />
          <span className="text-sm">Carregando dashboard...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-red-500 p-4">Erro ao carregar dados do dashboard.</div>
  }

  const { kpis, ordersByStatus, revenueByDay, topProducts, topSellers, paymentMethods, recentOrders } = data

  // Últimos 14 dias para exibição mais limpa no chart
  const chartData = revenueByDay.slice(-14)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lastUpdate ? `Atualizado: ${lastUpdate.toLocaleTimeString('pt-BR')}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {kpis.pendingOrders > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium px-3 py-1.5 rounded-full">
              <FiAlertCircle size={13} />
              {kpis.pendingOrders} pedido{kpis.pendingOrders > 1 ? 's' : ''} pendente{kpis.pendingOrders > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={load}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            <FiRefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: 'overview', label: 'Visão Geral' },
          { key: 'sales', label: 'Vendas & Pedidos' },
          { key: 'sellers', label: 'Vendedores' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== VISÃO GERAL ========== */}
      {activeTab === 'overview' && (
        <>
          {/* KPIs principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Receita do Mês"
              value={fmt(kpis.revenueThisMonth)}
              sub={`Total: ${fmt(kpis.totalRevenue)}`}
              icon={FiDollarSign}
              color="text-green-600"
              change={kpis.revenueChange}
            />
            <KPICard
              title="Pedidos do Mês"
              value={kpis.ordersThisMonth}
              sub={`Hoje: ${kpis.ordersToday}`}
              icon={FiShoppingBag}
              color="text-blue-600"
              change={kpis.ordersChange}
            />
            <KPICard
              title="Usuários Cadastrados"
              value={kpis.totalUsers}
              sub={`+${kpis.newUsersThisWeek} esta semana`}
              icon={FiUsers}
              color="text-purple-600"
            />
            <KPICard
              title="Produtos Ativos"
              value={kpis.activeProducts}
              sub={`${kpis.totalProducts} total`}
              icon={FiPackage}
              color="text-indigo-600"
            />
          </div>

          {/* Segunda linha de KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Pedidos Pendentes"
              value={kpis.pendingOrders}
              sub="Aguardando pagamento"
              icon={FiClock}
              color="text-yellow-600"
              alert={kpis.pendingOrders > 0}
            />
            <KPICard
              title="Em Processamento"
              value={kpis.processingOrders}
              sub="Preparando envio"
              icon={FiRefreshCw}
              color="text-blue-500"
            />
            <KPICard
              title="Vendedores Ativos"
              value={kpis.activeSellers}
              sub={`${kpis.pendingSellers} aguardando aprovação`}
              icon={FiShoppingCart}
              color="text-emerald-600"
              alert={kpis.pendingSellers > 0}
            />
            <KPICard
              title="Assinaturas Ativas"
              value={kpis.activeSubscriptions}
              sub={`${kpis.expiredSubscriptions} expiradas`}
              icon={FiStar}
              color="text-orange-600"
              alert={kpis.expiredSubscriptions > 0}
            />
          </div>

          {/* Gráfico receita 14 dias + donut status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Area chart receita */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Receita — Últimos 14 dias</h3>
                <span className="text-xs text-gray-400">Pedidos não cancelados</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={v => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="receita" name="receita"
                    stroke="#6366F1" strokeWidth={2} fill="url(#colorReceita)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Donut status pedidos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Status dos Pedidos</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%" cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {ordersByStatus.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, STATUS_LABELS[name as string] || name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {ordersByStatus.map(s => (
                  <div key={s.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.status] }} />
                      <span className="text-gray-600">{STATUS_LABELS[s.status] || s.status}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pedidos recentes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Pedidos Recentes</h3>
              <a href="/admin/vendas/pedidos" className="text-xs text-indigo-600 hover:underline">Ver todos â†’</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">ID</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Cliente</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Total</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Pagamento</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-2.5 px-3 font-mono text-xs text-gray-400">{order.id.slice(0, 8)}…</td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{order.buyerName}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{fmt(order.total)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: `${STATUS_COLORS[order.status]}20`,
                            color: STATUS_COLORS[order.status]
                          }}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs capitalize">
                        {order.paymentMethod?.replace('_', ' ').toLowerCase() || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 text-xs">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========== VENDAS & PEDIDOS ========== */}
      {activeTab === 'sales' && (
        <>
          {/* Gráfico de barras — pedidos por dia */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Receita & Pedidos — Últimos 30 dias</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByDay} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="receita" name="receita" fill="#6366F1" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar yAxisId="right" dataKey="pedidos" name="pedidos" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top produtos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Top 5 Produtos Mais Vendidos</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topProducts} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip formatter={(v, name) => name === 'receita' ? [fmt(Number(v)), 'Receita'] : [v, 'Vendas']} />
                  <Bar dataKey="vendas" name="vendas" fill="#6366F1" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Formas de pagamento */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Formas de Pagamento</h3>
              {paymentMethods.length === 0 ? (
                <p className="text-sm text-gray-400">Sem dados de pagamento</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={paymentMethods} dataKey="count" nameKey="method"
                        cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                        {paymentMethods.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {paymentMethods.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-gray-600 truncate capitalize">
                          {p.method.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        <span className="font-semibold text-gray-800 ml-auto">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========== VENDEDORES ========== */}
      {activeTab === 'sellers' && (
        <>
          {/* KPIs vendedores */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Vendedores" value={kpis.totalSellers} icon={FiShoppingCart} color="text-indigo-600" />
            <KPICard title="Vendedores Ativos" value={kpis.activeSellers} icon={FiTrendingUp} color="text-green-600" />
            <KPICard title="Pendentes Aprovação" value={kpis.pendingSellers} icon={FiClock} color="text-yellow-600" alert={kpis.pendingSellers > 0} />
            <KPICard title="Planos Ativos" value={kpis.activeSubscriptions} sub={`${kpis.expiredSubscriptions} expirados`} icon={FiStar} color="text-purple-600" />
          </div>

          {/* Top vendedores */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Top Vendedores por Receita</h3>
            {topSellers.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum vendedor com vendas ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSellers} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip formatter={(v) => [fmt(Number(v)), 'Receita']} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="receita" name="Receita" fill="#6366F1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="comissao" name="Comissão" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tabela detalhada */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Desempenho dos Vendedores</h3>
              <a href="/admin/vendedores" className="text-xs text-indigo-600 hover:underline">Ver todos â†’</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">#</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Loja</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Pedidos</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Receita</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {topSellers.map((s, i) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-2.5 px-3 text-gray-400 text-xs font-bold">#{i + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{s.nome}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">{s.pedidos}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-green-600">{fmt(s.receita)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-indigo-600">{fmt(s.comissao)}</td>
                    </tr>
                  ))}
                  {topSellers.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">Sem dados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
