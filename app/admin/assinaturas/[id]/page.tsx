'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FiArrowLeft, FiFileText, FiShoppingBag, FiDollarSign,
  FiPackage, FiCalendar, FiUser, FiCheckCircle, FiXCircle,
  FiClock, FiAlertCircle, FiTrendingUp, FiBox
} from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ContractDetail {
  subscription: {
    id: string
    status: string
    startDate: string
    endDate: string
    price: number
    billingCycle: string
    contractNumber?: string
    autoRenew: boolean
    notes?: string
    plan: {
      name: string
      description: string
      maxProducts?: number
      maxOrders?: number
      maxRevenue?: number
      platformCommission: number
      hasMarketplaceIntegration: boolean
      hasDropshipping: boolean
      hasAdvancedAnalytics: boolean
    }
    seller: {
      id: string
      storeName: string
      storeSlug: string
      status: string
      businessName?: string
      user: { name: string; email: string; phone?: string }
    }
  }
  consumo: {
    totalProducts: number
    activeProducts: number
    totalOrdersContract: number
    revenueContract: number
    commissionEarned: number
    ordersThisMonth: number
    revenueThisMonth: number
    commissionThisMonth: number
  }
  usage: {
    products: { current: number; limit: number | null; pct: number | null }
    orders: { current: number; limit: number | null; pct: number | null }
    revenue: { current: number; limit: number | null; pct: number | null }
  }
  recentOrders: Array<{
    id: string
    id: string
    status: string
    total: number
    createdAt: string
    buyerName?: string
    user?: { name: string }
  }>
  allSubscriptions: Array<{
    id: string
    status: string
    startDate: string
    endDate: string
    price: number
    contractNumber?: string
    plan: { name: string }
  }>
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE:          { label: 'Ativa',              color: 'bg-green-100 text-green-800' },
  TRIAL:           { label: 'Trial',              color: 'bg-blue-100 text-blue-800' },
  EXPIRED:         { label: 'Expirada',           color: 'bg-red-100 text-red-800' },
  CANCELLED:       { label: 'Cancelada',          color: 'bg-gray-100 text-gray-800' },
  SUSPENDED:       { label: 'Suspensa',           color: 'bg-yellow-100 text-yellow-800' },
  PENDING_PAYMENT: { label: 'Pgto. Pendente',     color: 'bg-orange-100 text-orange-800' },
}

const orderStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pendente',   color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:  { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
  PROCESSING: { label: 'Processando',color: 'bg-indigo-100 text-indigo-700' },
  SHIPPED:    { label: 'Enviado',    color: 'bg-purple-100 text-purple-700' },
  DELIVERED:  { label: 'Entregue',   color: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'Cancelado',  color: 'bg-red-100 text-red-700' },
  REFUNDED:   { label: 'Reembolsado',color: 'bg-gray-100 text-gray-700' },
}

function UsageBar({ label, current, limit, pct, format = 'number' }: {
  label: string
  current: number
  limit: number | null
  pct: number | null
  format?: 'number' | 'currency'
}) {
  const displayCurrent = format === 'currency'
    ? `R$ ${current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : current.toLocaleString('pt-BR')
  const displayLimit = limit
    ? format === 'currency'
      ? `R$ ${limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : limit.toLocaleString('pt-BR')
    : 'Ilimitado'

  const barColor = pct === null ? 'bg-gray-400' : pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-900 font-semibold">
          {displayCurrent} / <span className="text-gray-500">{displayLimit}</span>
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {pct !== null && (
        <p className="text-xs text-gray-500 text-right">{pct}% usado</p>
      )}
    </div>
  )
}

export default function ContratoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [changingStatus, setChangingStatus] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/subscriptions/${params.id}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast.error('Erro ao carregar contrato'))
      .finally(() => setLoading(false))
  }, [params.id])

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Alterar status para "${statusConfig[newStatus]?.label}"?`)) return
    setChangingStatus(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        toast.success('Status atualizado! Loja sincronizada.')
        // Reload
        const updated = await fetch(`/api/admin/subscriptions/${params.id}`).then(r => r.json())
        setData(updated)
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setChangingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Contrato não encontrado.</p>
        <Link href="/admin/assinaturas" className="text-primary-600 mt-4 inline-block">← Voltar</Link>
      </div>
    )
  }

  const { subscription, consumo, usage, recentOrders, allSubscriptions } = data
  const sc = statusConfig[subscription.status] ?? { label: subscription.status, color: 'bg-gray-100 text-gray-800' }
  const sellerSc = statusConfig[subscription.seller.status] ?? { label: subscription.seller.status, color: 'bg-gray-100 text-gray-800' }

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/assinaturas" className="text-gray-400 hover:text-gray-700 transition-colors">
            <FiArrowLeft className="text-xl" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiFileText className="text-primary-600" />
              Contrato {subscription.contractNumber ?? subscription.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{subscription.seller.storeName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${sc.color}`}>{sc.label}</span>
          <select
            disabled={changingStatus}
            onChange={e => e.target.value && handleStatusChange(e.target.value)}
            value=""
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 bg-white disabled:opacity-50"
          >
            <option value="" disabled>Alterar status...</option>
            <option value="ACTIVE">✅ Ativar</option>
            <option value="SUSPENDED">⏸ Suspender</option>
            <option value="CANCELLED">❌ Cancelar</option>
            <option value="EXPIRED">⌛ Marcar Expirado</option>
          </select>
        </div>
      </div>

      {/* Alertas */}
      {subscription.seller.status === 'SUSPENDED' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <FiAlertCircle className="text-red-500 text-xl flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Loja suspensa</p>
            <p className="text-sm text-red-600">Os produtos desta loja estão ocultos para os compradores.</p>
          </div>
        </div>
      )}

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna esquerda: info do contrato + vendedor */}
        <div className="space-y-6 lg:col-span-1">

          {/* Informações do contrato */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiFileText className="text-primary-600" /> Contrato
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Plano</dt>
                <dd className="font-medium text-gray-900">{subscription.plan.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Valor</dt>
                <dd className="font-medium text-gray-900">
                  R$ {subscription.price.toFixed(2)}{' '}
                  <span className="text-gray-400 text-xs">
                    / {subscription.billingCycle === 'MONTHLY' ? 'mês' :
                       subscription.billingCycle === 'QUARTERLY' ? 'trim.' :
                       subscription.billingCycle === 'SEMIANNUAL' ? 'sem.' : 'ano'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Início</dt>
                <dd className="text-gray-900">{new Date(subscription.startDate).toLocaleDateString('pt-BR')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Vencimento</dt>
                <dd className="text-gray-900">{new Date(subscription.endDate).toLocaleDateString('pt-BR')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Comissão plataforma</dt>
                <dd className="font-medium text-primary-600">{subscription.plan.platformCommission}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Renovação auto</dt>
                <dd>{subscription.autoRenew ? '✅ Sim' : '❌ Não'}</dd>
              </div>
            </dl>

            {/* Features do plano */}
            <div className="border-t pt-3 space-y-1.5">
              {[
                { key: 'hasMarketplaceIntegration', label: 'Integração Marketplace' },
                { key: 'hasDropshipping', label: 'Dropshipping' },
                { key: 'hasAdvancedAnalytics', label: 'Analytics Avançado' },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-2 text-sm">
                  {(subscription.plan as any)[f.key]
                    ? <FiCheckCircle className="text-green-500" />
                    : <FiXCircle className="text-gray-300" />}
                  <span className={!(subscription.plan as any)[f.key] ? 'text-gray-400' : 'text-gray-700'}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vendedor */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiUser className="text-primary-600" /> Vendedor
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                {subscription.seller.user.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{subscription.seller.user.name}</p>
                <p className="text-xs text-gray-500">{subscription.seller.user.email}</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Loja</dt>
                <dd className="font-medium text-gray-900">{subscription.seller.storeName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status da loja</dt>
                <dd>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${sellerSc.color}`}>
                    {sellerSc.label}
                  </span>
                </dd>
              </div>
            </dl>
            <Link
              href={`/admin/sellers/${subscription.seller.id}`}
              className="block text-center text-sm text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg py-2 mt-1 transition-colors"
            >
              Ver perfil do vendedor →
            </Link>
          </div>

        </div>

        {/* Coluna direita: consumo */}
        <div className="lg:col-span-2 space-y-6">

          {/* Cards resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Produtos cadastrados', value: consumo.totalProducts, icon: FiBox, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Pedidos no contrato',  value: consumo.totalOrdersContract, icon: FiShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
              {
                label: 'Receita no contrato',
                value: `R$ ${consumo.revenueContract.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                icon: FiTrendingUp,
                color: 'text-green-600',
                bg: 'bg-green-50'
              },
              {
                label: 'Comissão gerada',
                value: `R$ ${consumo.commissionEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                icon: FiDollarSign,
                color: 'text-orange-600',
                bg: 'bg-orange-50'
              },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                  <card.icon className={`${card.color} text-lg`} />
                </div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Consumo do mês atual */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiCalendar className="text-primary-600" />
              Consumo — {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Pedidos</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{consumo.ordersThisMonth}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Receita</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  R$ {consumo.revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Comissão</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">
                  R$ {consumo.commissionThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Uso dos limites do plano */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiPackage className="text-primary-600" /> Uso dos Limites do Plano
            </h2>
            <div className="space-y-5">
              <UsageBar
                label="Produtos"
                current={usage.products.current}
                limit={usage.products.limit}
                pct={usage.products.pct}
              />
              <UsageBar
                label="Pedidos no período"
                current={usage.orders.current}
                limit={usage.orders.limit}
                pct={usage.orders.pct}
              />
              <UsageBar
                label="Receita no período"
                current={usage.revenue.current}
                limit={usage.revenue.limit}
                pct={usage.revenue.pct}
                format="currency"
              />
            </div>
          </div>

          {/* Últimos pedidos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FiShoppingBag className="text-primary-600" /> Últimos Pedidos
              </h2>
              <Link href={`/admin/orders?seller=${subscription.seller.id}`} className="text-xs text-primary-600 hover:underline">
                Ver todos →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nenhum pedido ainda</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Comprador</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map(order => {
                      const osc = orderStatusConfig[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' }
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-sm font-mono text-gray-700">#{order.id.slice(-8).toUpperCase()}</td>
                          <td className="px-5 py-3 text-sm text-gray-700">{order.user?.name ?? order.buyerName ?? '-'}</td>
                          <td className="px-5 py-3 text-sm font-medium text-gray-900">
                            R$ {(order.total ?? 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${osc.color}`}>{osc.label}</span>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Histórico de contratos */}
          {allSubscriptions.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FiClock className="text-primary-600" /> Histórico de Contratos
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {allSubscriptions.map(sub => {
                  const ssc = statusConfig[sub.status] ?? { label: sub.status, color: 'bg-gray-100 text-gray-800' }
                  return (
                    <div key={sub.id} className={`flex items-center justify-between px-5 py-3 hover:bg-gray-50 ${sub.id === params.id ? 'bg-primary-50' : ''}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{sub.plan.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(sub.startDate).toLocaleDateString('pt-BR')} – {new Date(sub.endDate).toLocaleDateString('pt-BR')}
                          {sub.contractNumber && <span className="ml-2 font-mono">{sub.contractNumber}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">R$ {sub.price.toFixed(2)}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ssc.color}`}>{ssc.label}</span>
                        {sub.id !== params.id && (
                          <Link href={`/admin/assinaturas/${sub.id}`} className="text-xs text-primary-600 hover:underline">
                            Ver →
                          </Link>
                        )}
                        {sub.id === params.id && <span className="text-xs text-primary-600 font-semibold">atual</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
