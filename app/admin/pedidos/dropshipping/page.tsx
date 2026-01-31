'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import { 
  FiPackage, FiRefreshCw, FiExternalLink, FiTruck, FiCheck, 
  FiClock, FiAlertCircle, FiSearch, FiFilter, FiChevronLeft,
  FiCopy, FiEye, FiSend, FiX, FiRepeat, FiArrowRight
} from 'react-icons/fi'
import { formatOrderNumber } from '@/lib/order'

interface SimilarProduct {
  id: string
  name: string
  price: number
  costPrice: number | null
  image: string
  stock: number
  supplierSku: string | null
  supplierId: string | null
  supplierName: string
  isChoiceProduct: boolean
}

interface SwapItem {
  orderItemId: string
  orderId: string
  product: {
    id: string
    name: string
    images: string
    supplierId: string | null
    supplierName: string
  }
}

interface DropOrder {
  id: string
  orderNumber: string
  createdAt: string
  status: string
  paymentStatus: string
  total: number
  shippingAddress: string
  user: {
    name: string
    email: string
  }
  items: {
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      images: string
      isDropshipping: boolean
      aliexpressProductId: string | null
      supplier: {
        id: string
        name: string
        type: string
      } | null
    }
  }[]
  // Campos de dropshipping
  aliexpressOrderId: string | null
  aliexpressStatus: string | null
  supplierTrackingNumber: string | null
  supplierOrderData: string | null
  sentToSupplierAt: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  'PENDING': { label: 'Pendente Envio', color: 'bg-yellow-100 text-yellow-800', icon: FiClock },
  'SENT': { label: 'Enviado ao Fornecedor', color: 'bg-blue-100 text-blue-800', icon: FiSend },
  'PLACE_ORDER_SUCCESS': { label: 'Pedido Criado', color: 'bg-green-100 text-green-800', icon: FiCheck },
  'IN_CANCEL': { label: 'Cancelando', color: 'bg-red-100 text-red-800', icon: FiX },
  'WAIT_SELLER_SEND_GOODS': { label: 'Aguardando Envio', color: 'bg-orange-100 text-orange-800', icon: FiClock },
  'SELLER_PART_SEND_GOODS': { label: 'Parcialmente Enviado', color: 'bg-purple-100 text-purple-800', icon: FiTruck },
  'WAIT_BUYER_ACCEPT_GOODS': { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-800', icon: FiTruck },
  'FUND_PROCESSING': { label: 'Processando Pagamento', color: 'bg-cyan-100 text-cyan-800', icon: FiClock },
  'FINISH': { label: 'Finalizado', color: 'bg-green-100 text-green-800', icon: FiCheck },
  'COMPLETED': { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: FiCheck },
}

export default function DropshippingOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<DropOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'transit' | 'delivered'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<DropOrder | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [sendingOrder, setSendingOrder] = useState<string | null>(null)
  
  // Estados para troca de produto
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [swapItem, setSwapItem] = useState<SwapItem | null>(null)
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [swapSearchQuery, setSwapSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/orders/dropshipping')
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  const refreshOrderStatus = async (orderId: string) => {
    try {
      setRefreshing(true)
      const res = await fetch(`/api/admin/orders/aliexpress-status?orderId=${orderId}`)
      if (res.ok) {
        const data = await res.json()
        toast.success(`Status atualizado: ${data.status}`)
        loadOrders()
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      toast.error('Erro ao atualizar status')
    } finally {
      setRefreshing(false)
    }
  }

  const sendToSupplier = async (orderId: string) => {
    try {
      setSendingOrder(orderId)
      const res = await fetch('/api/admin/orders/send-to-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success('Pedido enviado ao fornecedor!')
        loadOrders()
      } else {
        toast.error(data.message || 'Erro ao enviar pedido')
      }
    } catch (error) {
      toast.error('Erro ao enviar pedido ao fornecedor')
    } finally {
      setSendingOrder(null)
    }
  }

  const refreshAllStatuses = async () => {
    try {
      setRefreshing(true)
      const sentOrders = orders.filter(o => o.aliexpressOrderId)
      
      for (const order of sentOrders) {
        await refreshOrderStatus(order.id)
      }
      
      toast.success('Todos os status atualizados!')
    } catch (error) {
      toast.error('Erro ao atualizar status')
    } finally {
      setRefreshing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  // Funções para troca de produto
  const openSwapModal = async (item: any, order: DropOrder) => {
    const swapData: SwapItem = {
      orderItemId: item.id,
      orderId: order.id,
      product: {
        id: item.product.id,
        name: item.product.name,
        images: item.product.images,
        supplierId: item.product.supplier?.id || null,
        supplierName: item.product.supplier?.name || 'Sem fornecedor',
      }
    }
    setSwapItem(swapData)
    setShowSwapModal(true)
    setSwapSearchQuery('')
    await loadSimilarProducts(item.product.id, item.product.supplier?.id)
  }

  const loadSimilarProducts = async (productId: string, excludeSupplierId?: string | null) => {
    try {
      setLoadingSimilar(true)
      setSimilarProducts([])
      
      const params = new URLSearchParams({ productId })
      if (excludeSupplierId) {
        params.append('excludeSupplierId', excludeSupplierId)
      }
      
      const res = await fetch(`/api/admin/orders/find-similar-products?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSimilarProducts(data.products || [])
      } else {
        toast.error('Erro ao buscar produtos similares')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao buscar produtos')
    } finally {
      setLoadingSimilar(false)
    }
  }

  const searchSimilarProducts = async () => {
    if (!swapSearchQuery.trim()) {
      if (swapItem) {
        await loadSimilarProducts(swapItem.product.id, swapItem.product.supplierId)
      }
      return
    }
    
    try {
      setLoadingSimilar(true)
      const params = new URLSearchParams({ q: swapSearchQuery })
      if (swapItem?.product.supplierId) {
        params.append('excludeSupplierId', swapItem.product.supplierId)
      }
      
      const res = await fetch(`/api/admin/orders/find-similar-products?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSimilarProducts(data.products || [])
      }
    } catch (error) {
      toast.error('Erro na busca')
    } finally {
      setLoadingSimilar(false)
    }
  }

  const executeSwap = async (newProductId: string) => {
    if (!swapItem) return
    
    try {
      setSwapping(true)
      const res = await fetch('/api/admin/orders/swap-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: swapItem.orderItemId,
          newProductId,
          keepPrice: true
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`Produto trocado! Novo fornecedor: ${data.swap.new.supplierName}`)
        setShowSwapModal(false)
        setSwapItem(null)
        loadOrders() // Recarregar pedidos
        // Se o modal do pedido estiver aberto, fechar também
        if (showModal) {
          setShowModal(false)
          setSelectedOrder(null)
        }
      } else {
        toast.error(data.error || 'Erro ao trocar produto')
      }
    } catch (error) {
      toast.error('Erro ao trocar produto')
    } finally {
      setSwapping(false)
    }
  }

  const getStatusInfo = (order: DropOrder) => {
    if (!order.aliexpressOrderId) {
      return STATUS_MAP['PENDING']
    }
    return STATUS_MAP[order.aliexpressStatus || 'SENT'] || STATUS_MAP['SENT']
  }

  const filteredOrders = orders.filter(order => {
    // Filtro por status
    if (filter === 'pending' && order.aliexpressOrderId) return false
    if (filter === 'sent' && !order.aliexpressOrderId) return false
    if (filter === 'transit' && order.aliexpressStatus !== 'WAIT_BUYER_ACCEPT_GOODS') return false
    if (filter === 'delivered' && order.aliexpressStatus !== 'FINISH') return false
    
    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.user.name.toLowerCase().includes(query) ||
        order.aliexpressOrderId?.toLowerCase().includes(query) ||
        order.supplierTrackingNumber?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  const stats = {
    total: orders.length,
    pending: orders.filter(o => !o.aliexpressOrderId).length,
    sent: orders.filter(o => o.aliexpressOrderId && o.aliexpressStatus !== 'FINISH').length,
    delivered: orders.filter(o => o.aliexpressStatus === 'FINISH').length,
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getProductImage = (images: string) => {
    try {
      const parsed = JSON.parse(images)
      return Array.isArray(parsed) ? parsed[0] : images
    } catch {
      return images || '/placeholder.png'
    }
  }

  if (status === 'loading' || loading) {
    return <LoadingSpinner message="Carregando pedidos..." />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/pedidos" className="p-2 hover:bg-gray-100 rounded-lg">
            <FiChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos Dropshipping</h1>
            <p className="text-gray-600">Gerencie os pedidos enviados aos fornecedores</p>
          </div>
        </div>
        <button
          onClick={refreshAllStatuses}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
          Atualizar Todos
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          onClick={() => setFilter('all')}
          className={`p-4 rounded-lg cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-primary-500 bg-primary-50' : 'bg-white hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-lg">
              <FiPackage className="text-gray-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-lg cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'bg-white hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FiClock className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pendentes</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilter('sent')}
          className={`p-4 rounded-lg cursor-pointer transition-all ${filter === 'sent' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiTruck className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
              <p className="text-sm text-gray-600">Em Andamento</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilter('delivered')}
          className={`p-4 rounded-lg cursor-pointer transition-all ${filter === 'delivered' ? 'ring-2 ring-green-500 bg-green-50' : 'bg-white hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiCheck className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-sm text-gray-600">Entregues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número do pedido, cliente, ID AliExpress ou rastreio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <FiPackage className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Pedido</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Produtos</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ID AliExpress</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Rastreio</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => {
                  const statusInfo = getStatusInfo(order)
                  const StatusIcon = statusInfo.icon
                  const dropItems = order.items.filter(i => i.product.supplier?.type === 'aliexpress')
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-primary-600">{formatOrderNumber(order.id)}</p>
                          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(order.total)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{order.user.name}</p>
                        <p className="text-xs text-gray-500">{order.user.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {dropItems.slice(0, 2).map((item, idx) => (
                            <img
                              key={idx}
                              src={getProductImage(item.product.images)}
                              alt={item.product.name}
                              className="w-10 h-10 object-cover rounded border"
                            />
                          ))}
                          {dropItems.length > 2 && (
                            <span className="text-xs text-gray-500">+{dropItems.length - 2}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{dropItems.length} item(s) drop</p>
                      </td>
                      <td className="px-4 py-4">
                        {order.aliexpressOrderId ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {order.aliexpressOrderId}
                            </code>
                            <button
                              onClick={() => copyToClipboard(order.aliexpressOrderId!)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <FiCopy size={14} className="text-gray-400" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {order.supplierTrackingNumber ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {order.supplierTrackingNumber}
                            </code>
                            <button
                              onClick={() => copyToClipboard(order.supplierTrackingNumber!)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <FiCopy size={14} className="text-gray-400" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!order.aliexpressOrderId ? (
                            <button
                              onClick={() => sendToSupplier(order.id)}
                              disabled={sendingOrder === order.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              {sendingOrder === order.id ? (
                                <FiRefreshCw className="animate-spin" size={14} />
                              ) : (
                                <FiSend size={14} />
                              )}
                              Enviar
                            </button>
                          ) : (
                            <button
                              onClick={() => refreshOrderStatus(order.id)}
                              disabled={refreshing}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="Atualizar status"
                            >
                              <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setShowModal(true)
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Ver detalhes"
                          >
                            <FiEye size={16} />
                          </button>
                          <Link
                            href={`/admin/pedidos/${order.id}`}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Ver pedido completo"
                          >
                            <FiExternalLink size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Detalhes do Pedido {formatOrderNumber(selectedOrder.id)}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info do Pedido */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedOrder.user.name}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data do Pedido</p>
                  <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedOrder.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status Pagamento</p>
                  <p className="font-medium">{selectedOrder.paymentStatus}</p>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Endereço de Entrega</p>
                <p className="text-sm bg-gray-50 p-3 rounded-lg">
                  {selectedOrder.shippingAddress || 'Não informado'}
                </p>
              </div>

              {/* Info AliExpress */}
              {selectedOrder.aliexpressOrderId && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">Dados do AliExpress</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">ID do Pedido:</span>
                      <code className="bg-blue-100 px-2 py-1 rounded text-sm">
                        {selectedOrder.aliexpressOrderId}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">Status:</span>
                      <span className="font-medium">{selectedOrder.aliexpressStatus || '-'}</span>
                    </div>
                    {selectedOrder.supplierTrackingNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">Rastreio:</span>
                        <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                          {selectedOrder.supplierTrackingNumber}
                        </code>
                      </div>
                    )}
                    {selectedOrder.sentToSupplierAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">Enviado em:</span>
                        <span className="text-sm">{formatDate(selectedOrder.sentToSupplierAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Produtos Drop */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Produtos Dropshipping</h3>
                <div className="space-y-3">
                  {selectedOrder.items
                    .filter(i => i.product.supplier?.type === 'aliexpress')
                    .map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={getProductImage(item.product.images)}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-500">
                            Qtd: {item.quantity} × {formatCurrency(item.price)}
                          </p>
                          {item.product.aliexpressProductId && (
                            <p className="text-xs text-gray-400">
                              AliExpress ID: {item.product.aliexpressProductId}
                            </p>
                          )}
                          {item.product.supplier && (
                            <p className="text-xs text-blue-600">
                              Fornecedor: {item.product.supplier.name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-semibold">
                            {formatCurrency(item.quantity * item.price)}
                          </p>
                          {/* Botão de trocar produto - só aparece se não foi enviado ao fornecedor */}
                          {!selectedOrder.aliexpressOrderId && (
                            <button
                              onClick={() => openSwapModal(item, selectedOrder)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                              title="Trocar por produto de outro fornecedor"
                            >
                              <FiRepeat size={12} />
                              Trocar Fornecedor
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Dados brutos do fornecedor */}
              {selectedOrder.supplierOrderData && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Dados do Fornecedor (JSON)</p>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedOrder.supplierOrderData), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Fechar
              </button>
              <Link
                href={`/admin/pedidos/${selectedOrder.id}`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Ver Pedido Completo
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Troca de Produto */}
      {showSwapModal && swapItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FiRepeat className="text-orange-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Trocar Produto</h2>
                  <p className="text-sm text-gray-600">Selecione um produto equivalente de outro fornecedor</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSwapModal(false)
                  setSwapItem(null)
                  setSimilarProducts([])
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Produto atual */}
            <div className="p-4 bg-orange-50 border-b">
              <p className="text-sm text-orange-700 font-medium mb-2">Produto Atual:</p>
              <div className="flex items-center gap-3">
                <img
                  src={getProductImage(swapItem.product.images)}
                  alt={swapItem.product.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{swapItem.product.name}</p>
                  <p className="text-sm text-orange-600">
                    Fornecedor: {swapItem.product.supplierName}
                  </p>
                </div>
              </div>
            </div>

            {/* Busca */}
            <div className="p-4 border-b">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={swapSearchQuery}
                    onChange={(e) => setSwapSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchSimilarProducts()}
                    placeholder="Buscar produto por nome..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={searchSimilarProducts}
                  disabled={loadingSimilar}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Buscar
                </button>
              </div>
            </div>

            {/* Lista de produtos similares */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingSimilar ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <span className="ml-3 text-gray-600">Buscando produtos...</span>
                </div>
              ) : similarProducts.length === 0 ? (
                <div className="text-center py-12">
                  <FiPackage className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500">Nenhum produto similar encontrado</p>
                  <p className="text-sm text-gray-400 mt-1">Tente buscar por outro termo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-3">
                    {similarProducts.length} produto(s) encontrado(s) de outros fornecedores:
                  </p>
                  {similarProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-blue-600">
                            {product.supplierName}
                          </span>
                          {product.isChoiceProduct && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              Choice
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>Custo: {formatCurrency(product.costPrice || product.price)}</span>
                          <span>Estoque: {product.stock}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => executeSwap(product.id)}
                        disabled={swapping || product.stock < 1}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {swapping ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Trocando...
                          </>
                        ) : (
                          <>
                            <FiArrowRight size={16} />
                            Selecionar
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowSwapModal(false)
                  setSwapItem(null)
                  setSimilarProducts([])
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
