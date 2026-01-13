'use client'

import { useEffect, useState } from 'react'
import { 
  FiRefreshCw, 
  FiCheckCircle, 
  FiXCircle, 
  FiClock, 
  FiSearch,
  FiDollarSign,
  FiAlertTriangle,
  FiArrowLeft,
  FiArrowRight,
  FiFilter,
  FiEye,
  FiCornerDownLeft,
  FiPackage,
  FiCheck
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  selectedSize?: string
  selectedColor?: string
  itemType?: 'STOCK' | 'DROPSHIPPING'
  refundedAt?: string | null
  product?: {
    name: string
    images: string[]
  }
}

interface Order {
  id: string
  paymentId: string
  paymentStatus: string
  total: number
  subtotal: number
  shippingCost: number
  createdAt: string
  buyerName: string | null
  buyerEmail: string | null
  items: OrderItem[]
  user?: {
    name: string | null
    email: string
  }
  totalRefunded?: number
  availableForRefund?: number
  isHybrid?: boolean
  subOrderIds?: string[]
  refundedItemsCount?: number
  availableItemsCount?: number
  refundedItemsTotal?: number
  availableItemsTotal?: number
}

interface Refund {
  id: string
  orderId: string
  paymentId: string
  refundId: string | null
  amount: number
  reason: string | null
  gateway: string
  status: string
  processedBy: string | null
  createdAt: string
  order: {
    id: string
    total: number
    buyerName: string | null
    buyerEmail: string | null
    user: {
      name: string | null
      email: string
    } | null
  }
}

interface RefundTotals {
  approved: { count: number; amount: number }
  pending: { count: number; amount: number }
  rejected: { count: number; amount: number }
  total: { count: number; amount: number }
}

export default function EstornosPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [orders, setOrders] = useState<Order[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [totals, setTotals] = useState<RefundTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Modal de estorno
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})
  const [refundReason, setRefundReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (activeTab === 'new') {
      loadApprovedOrders()
    } else {
      loadRefundHistory()
    }
  }, [activeTab])

  async function loadApprovedOrders() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        status: 'approved',
        ...(search && { search })
      })
      
      const response = await fetch(`/api/admin/financeiro/orders-for-refund?${params}`)
      
      if (!response.ok) throw new Error('Erro ao carregar pedidos')
      
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  async function loadRefundHistory() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/financeiro/refunds')
      
      if (!response.ok) throw new Error('Erro ao carregar histórico')
      
      const data = await response.json()
      setRefunds(data.refunds || [])
      setTotals(data.totals)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }

  function openRefundModal(order: Order) {
    setSelectedOrder(order)
    setRefundType('full')
    setSelectedItems({})
    setRefundReason('')
    // Selecionar apenas itens NÃO estornados por padrão
    const availableItems: Record<string, boolean> = {}
    order.items.forEach(item => {
      if (!item.refundedAt) {
        availableItems[item.id] = true
      }
    })
    setSelectedItems(availableItems)
  }

  function calculateRefundAmount(): number {
    if (!selectedOrder) return 0
    
    // Valor disponível para estorno (total - já estornado)
    const availableAmount = selectedOrder.availableForRefund || selectedOrder.total
    
    // Contar apenas itens NÃO estornados
    const availableItems = selectedOrder.items.filter(item => !item.refundedAt)
    const totalAvailableItems = availableItems.length
    
    if (totalAvailableItems === 0) return 0
    
    if (refundType === 'full') {
      // Estorno "total" = estornar o que resta disponível
      return availableAmount
    }
    
    // Calcular valor baseado nos itens selecionados (apenas não-estornados podem ser selecionados)
    let itemsTotal = 0
    availableItems.forEach(item => {
      if (selectedItems[item.id]) {
        itemsTotal += item.price * item.quantity
      }
    })
    
    // Proporção do frete baseada apenas em itens disponíveis
    const selectedCount = Object.values(selectedItems).filter(Boolean).length
    const shippingPortion = selectedCount === totalAvailableItems 
      ? (selectedOrder.shippingCost || 0)
      : (selectedOrder.shippingCost || 0) * (selectedCount / totalAvailableItems)
    
    // Não pode ultrapassar o valor disponível
    const calculatedAmount = itemsTotal + shippingPortion
    return Math.min(calculatedAmount, availableAmount)
  }

  async function processRefund() {
    if (!selectedOrder) return
    
    const amount = calculateRefundAmount()
    if (amount <= 0) {
      toast.error('Selecione pelo menos um item para estornar')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/admin/financeiro/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          paymentId: selectedOrder.paymentId,
          amount: refundType === 'partial' ? amount : undefined, // undefined = estorno total
          reason: refundReason || (refundType === 'full' ? 'Estorno total' : 'Estorno parcial'),
          items: refundType === 'partial' ? Object.keys(selectedItems).filter(id => selectedItems[id]) : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar estorno')
      }

      toast.success(`Estorno de ${formatCurrency(amount)} processado com sucesso!`)
      setSelectedOrder(null)
      
      // Recarregar lista
      if (activeTab === 'new') {
        loadApprovedOrders()
      } else {
        loadRefundHistory()
      }
    } catch (error: any) {
      console.error('Erro ao processar estorno:', error)
      toast.error(error.message || 'Erro ao processar estorno')
    } finally {
      setProcessing(false)
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStatusBadge(status: string) {
    const statuses: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      approved: { 
        color: 'bg-green-100 text-green-800', 
        icon: <FiCheckCircle className="inline mr-1" />, 
        label: 'Aprovado' 
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: <FiClock className="inline mr-1" />, 
        label: 'Pendente' 
      },
      rejected: { 
        color: 'bg-red-100 text-red-800', 
        icon: <FiXCircle className="inline mr-1" />, 
        label: 'Rejeitado' 
      }
    }
    
    const statusInfo = statuses[status.toLowerCase()] || statuses.pending
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.icon}
        {statusInfo.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Estornos</h1>
          <p className="text-gray-500 mt-1">Processe estornos totais ou parciais de pagamentos aprovados</p>
        </div>
        <button 
          onClick={() => activeTab === 'new' ? loadApprovedOrders() : loadRefundHistory()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('new')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'new'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiCornerDownLeft className="inline mr-2" />
            Novo Estorno
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiClock className="inline mr-2" />
            Histórico de Estornos
          </button>
        </nav>
      </div>

      {/* Cards de Resumo - apenas no histórico */}
      {activeTab === 'history' && totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Estornado</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total.amount)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FiDollarSign className="text-2xl text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{totals.total.count} estornos</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Aprovados</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.approved.amount)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FiCheckCircle className="text-2xl text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{totals.approved.count} estornos</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totals.pending.amount)}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <FiClock className="text-2xl text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{totals.pending.count} estornos</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejeitados</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.rejected.amount)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <FiXCircle className="text-2xl text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{totals.rejected.count} estornos</p>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <form onSubmit={(e) => { e.preventDefault(); activeTab === 'new' ? loadApprovedOrders() : loadRefundHistory() }} className="flex gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'new' ? "Buscar por pedido ou cliente..." : "Buscar no histórico..."}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <FiRefreshCw className="animate-spin mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : activeTab === 'new' ? (
          /* Lista de pedidos aprovados para estorno */
          orders.length === 0 ? (
            <div className="p-8 text-center">
              <FiCheckCircle className="mx-auto text-5xl text-green-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido para estornar</h3>
              <p className="text-gray-500">Não há pedidos com pagamento aprovado no momento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID de Autorização
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Itens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <Link 
                            href={`/admin/pedidos/${order.id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {order.id.slice(0, 12)}...
                          </Link>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {order.isHybrid && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Híbrido
                              </span>
                            )}
                            {(order.totalRefunded ?? 0) > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                Estorno Parcial
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.buyerName || order.user?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.buyerEmail || order.user?.email || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600">
                          {order.paymentId}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-sm">
                              <FiPackage className="mr-1" />
                              {order.availableItemsCount || order.items.length} {(order.availableItemsCount || order.items.length) === 1 ? 'disponível' : 'disponíveis'}
                            </span>
                          </div>
                          {(order.refundedItemsCount ?? 0) > 0 && (
                            <span className="text-xs text-red-600">
                              {order.refundedItemsCount} {order.refundedItemsCount === 1 ? 'estornado' : 'estornados'}
                            </span>
                          )}
                          {order.items.some(i => i.itemType === 'DROPSHIPPING' && !i.refundedAt) && (
                            <span className="text-xs text-orange-600">
                              {order.items.filter(i => i.itemType === 'DROPSHIPPING' && !i.refundedAt).length} DROP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(order.total)}
                          </span>
                          {(order.totalRefunded ?? 0) > 0 ? (
                            <div className="mt-1">
                              <span className="text-xs text-red-600">
                                -{formatCurrency(Number(order.totalRefunded) || 0)} estornado
                              </span>
                              <br />
                              <span className="text-xs text-green-600 font-medium">
                                {formatCurrency(order.availableForRefund || 0)} disponível
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openRefundModal(order)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                        >
                          <FiCornerDownLeft className="mr-1" />
                          Estornar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Histórico de estornos */
          refunds.length === 0 ? (
            <div className="p-8 text-center">
              <FiAlertTriangle className="mx-auto text-5xl text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum estorno encontrado</h3>
              <p className="text-gray-500">Quando houver estornos processados, eles aparecerão aqui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Estornado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(refund.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/admin/pedidos/${refund.orderId}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {refund.orderId.slice(0, 12)}...
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">
                          {refund.order?.buyerName || refund.order?.user?.name || 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-red-600">
                          - {formatCurrency(refund.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 truncate max-w-xs">
                          {refund.reason || 'Não informado'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(refund.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Modal de Estorno */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">Processar Estorno</h3>
                {selectedOrder.isHybrid && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Pedido Híbrido
                  </span>
                )}
                {(selectedOrder.totalRefunded ?? 0) > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    Estorno Parcial
                  </span>
                )}
              </div>
              <p className="text-gray-500 mt-1">Pedido: {selectedOrder.id.slice(0, 16)}...</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Alerta de estorno parcial existente */}
              {(selectedOrder.totalRefunded ?? 0) > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle className="text-orange-500 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800">Este pedido já possui estornos</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Valor já estornado: <span className="font-bold">{formatCurrency(Number(selectedOrder.totalRefunded) || 0)}</span>
                      </p>
                      <p className="text-sm text-orange-700">
                        Valor disponível para estorno: <span className="font-bold text-green-700">{formatCurrency(selectedOrder.availableForRefund || 0)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info do pedido */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Cliente</p>
                    <p className="font-medium">{selectedOrder.buyerName || selectedOrder.user?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">ID de Autorização</p>
                    <p className="font-mono">{selectedOrder.paymentId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Valor Total do Pedido</p>
                    <p className="font-bold text-lg">{formatCurrency(selectedOrder.total)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Disponível para Estorno</p>
                    <p className="font-bold text-lg text-green-600">{formatCurrency(selectedOrder.availableForRefund || selectedOrder.total)}</p>
                  </div>
                </div>
              </div>

              {/* Tipo de estorno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Estorno</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setRefundType('full')
                      // Selecionar todos os itens
                      const allItems: Record<string, boolean> = {}
                      selectedOrder.items.forEach(item => { allItems[item.id] = true })
                      setSelectedItems(allItems)
                    }}
                    className={`flex-1 p-4 rounded-lg border-2 transition ${
                      refundType === 'full'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        refundType === 'full' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                      }`}>
                        {refundType === 'full' && <FiCheck className="text-white text-xs" />}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          {(selectedOrder.totalRefunded ?? 0) > 0 
                            ? 'Estornar Restante' 
                            : 'Estorno Total'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Estornar {formatCurrency(selectedOrder.availableForRefund || selectedOrder.total)}
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setRefundType('partial')}
                    className={`flex-1 p-4 rounded-lg border-2 transition ${
                      refundType === 'partial'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        refundType === 'partial' ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                      }`}>
                        {refundType === 'partial' && <FiCheck className="text-white text-xs" />}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Estorno Parcial</p>
                        <p className="text-sm text-gray-500">Selecione os itens</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Lista de itens (para estorno parcial) */}
              {refundType === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Selecione os itens a estornar
                  </label>
                  
                  {/* Itens já estornados */}
                  {selectedOrder.items.some(i => i.refundedAt) && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-red-600 mb-2 uppercase">Itens já estornados</p>
                      <div className="space-y-2 opacity-60">
                        {selectedOrder.items.filter(i => i.refundedAt).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center p-3 rounded-lg border border-red-200 bg-red-50"
                          >
                            <FiXCircle className="h-4 w-4 text-red-500" />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-500 line-through">
                                  {item.product?.name || `Produto ${item.productId.slice(0, 8)}`}
                                </p>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  ESTORNADO
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 line-through">
                                {item.quantity}x {formatCurrency(item.price)}
                              </p>
                            </div>
                            <span className="font-medium text-gray-400 line-through">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Itens disponíveis para estorno */}
                  {selectedOrder.items.some(i => !i.refundedAt) ? (
                    <>
                      <p className="text-xs font-medium text-green-600 mb-2 uppercase">Itens disponíveis para estorno</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedOrder.items.filter(i => !i.refundedAt).map((item) => (
                          <label
                            key={item.id}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${
                              selectedItems[item.id]
                                ? 'border-orange-300 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedItems[item.id] || false}
                              onChange={(e) => setSelectedItems({
                                ...selectedItems,
                                [item.id]: e.target.checked
                              })}
                              className="h-4 w-4 text-orange-600 rounded border-gray-300"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">
                                  {item.product?.name || `Produto ${item.productId.slice(0, 8)}`}
                                </p>
                                {item.itemType === 'DROPSHIPPING' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    DROP
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    ADM
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {item.quantity}x {formatCurrency(item.price)}
                                {item.selectedSize && ` • Tam: ${item.selectedSize}`}
                                {item.selectedColor && ` • Cor: ${item.selectedColor}`}
                              </p>
                            </div>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-lg bg-gray-100 text-center">
                      <p className="text-gray-500 text-sm">Todos os itens já foram estornados</p>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo do Estorno
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Descreva o motivo do estorno..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Valor a estornar */}
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900">Valor a Estornar:</span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(calculateRefundAmount())}
                  </span>
                </div>
                {refundType === 'partial' && (
                  <p className="text-sm text-gray-500 mt-1">
                    Inclui proporção do frete para os itens selecionados
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={processRefund}
                disabled={processing || calculateRefundAmount() <= 0}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FiCornerDownLeft />
                    Confirmar Estorno
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

