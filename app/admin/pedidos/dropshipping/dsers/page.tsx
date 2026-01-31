'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import { FiPackage, FiRefreshCw, FiExternalLink, FiTruck, FiCheck, 
  FiClock, FiAlertCircle, FiSearch, FiChevronLeft, FiDollarSign,
  FiCopy, FiEye, FiSend, FiX, FiShoppingCart, FiCreditCard,
  FiMapPin, FiUser, FiPhone, FiMail, FiChevronDown, FiChevronUp,
  FiCheckSquare, FiSquare, FiPlay, FiInfo, FiZap, FiPause
} from 'react-icons/fi'
import { formatOrderNumber } from '@/lib/order'
// Intervalo de polling automático (2 minutos)
const AUTO_SYNC_INTERVAL = 2 * 60 * 1000

interface ShippingOption {
  code: string
  company: string
  cost: number
  costFormatted: string
  deliveryDays: string
  isFree: boolean
}

interface DropOrder {
  id: string
  orderNumber: string
  createdAt: string
  status: string
  paymentStatus: string
  total: number
  shippingAddress: string
  buyerPhone?: string
  buyerCpf?: string
  user: {
    name: string
    email: string
    phone?: string
    cpf?: string
  }
  items: {
    id: string
    quantity: number
    price: number
    selectedVariant?: string
    product: {
      id: string
      name: string
      images: string
      isDropshipping: boolean
      supplierSku: string | null
      supplierUrl: string | null
      costPrice?: number
      supplier: {
        id: string
        name: string
      } | null
    }
  }[]
  // Campos de dropshipping
  aliexpressOrderId: string | null
  aliexpressStatus: string | null
  supplierTrackingNumber: string | null
  supplierOrderData: any
  sentToSupplierAt: string | null
  supplierUrl?: string | null
  // Impostos de importação
  importTax?: number
  icmsTax?: number
  // Calculados
  supplierCost?: number
  shippingCost?: number
  profit?: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'PENDING': { label: 'Aguardando Envio', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  'AWAITING_PAYMENT': { label: 'Aguardando Pagamento', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  'PLACE_ORDER_SUCCESS': { label: 'Pedido Criado - Pagar', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'WAIT_SELLER_SEND_GOODS': { label: 'Aguardando Envio Fornecedor', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'SELLER_PART_SEND_GOODS': { label: 'Parcialmente Enviado', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  'WAIT_BUYER_ACCEPT_GOODS': { label: 'Em Trânsito', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  'FUND_PROCESSING': { label: 'Processando Pagamento', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'FINISH': { label: 'Entregue', color: 'text-green-700', bgColor: 'bg-green-100' },
  'IN_CANCEL': { label: 'Cancelando', color: 'text-red-700', bgColor: 'bg-red-100' },
  'ERROR': { label: 'Erro', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export default function DSersLikePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // States
  const [orders, setOrders] = useState<DropOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'pending' | 'awaiting_payment' | 'in_transit' | 'delivered'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Shipping options modal
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [selectedOrderForShipping, setSelectedOrderForShipping] = useState<DropOrder | null>(null)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [loadingShipping, setLoadingShipping] = useState(false)
  const [selectedShipping, setSelectedShipping] = useState<string>('')

  // Order details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<DropOrder | null>(null)

  // Tracking events modal
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [trackingOrder, setTrackingOrder] = useState<DropOrder | null>(null)
  const [trackingEvents, setTrackingEvents] = useState<any[]>([])
  const [loadingTracking, setLoadingTracking] = useState(false)
  const [trackingInfo, setTrackingInfo] = useState<any>(null)

  // Auto-sync states
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncStats, setSyncStats] = useState<{ updated: number; errors: number } | null>(null)
  const autoSyncRef = useRef<NodeJS.Timeout | null>(null)

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

  // Auto-sync: Buscar status dos pedidos no fornecedor automaticamente
  const syncOrderStatus = useCallback(async (silent = true) => {
    if (syncing) return

    setSyncing(true)
    if (!silent) {
      toast.loading('Atualizando status dos pedidos...', { id: 'sync-status' })
    }

    try {
      const res = await fetch('/api/cron/sync-drop-orders')
      const data = await res.json()

      if (data.success) {
        setLastSyncTime(new Date())
        setSyncStats({ updated: data.summary?.updated || 0, errors: data.summary?.errors || 0 })
        
        if (data.summary?.updated > 0) {
          // Recarregar pedidos se houve atualização
          await loadOrders()
          if (!silent) {
            toast.success(`${data.summary.updated} pedido(s) atualizado(s)`, { id: 'sync-status' })
          }
        } else if (!silent) {
          toast.success('Todos os pedidos estão atualizados', { id: 'sync-status' })
        }
      } else if (!silent) {
        toast.error(data.error || 'Erro ao sincronizar', { id: 'sync-status' })
      }
    } catch (error) {
      if (!silent) {
        toast.error('Erro ao sincronizar status', { id: 'sync-status' })
      }
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  // Configurar polling automático
  useEffect(() => {
    if (autoSyncEnabled) {
      // Primeira sync após 5 segundos
      const initialSync = setTimeout(() => syncOrderStatus(true), 5000)
      
      // Polling a cada 2 minutos
      autoSyncRef.current = setInterval(() => {
        syncOrderStatus(true)
      }, AUTO_SYNC_INTERVAL)

      return () => {
        clearTimeout(initialSync)
        if (autoSyncRef.current) {
          clearInterval(autoSyncRef.current)
        }
      }
    } else {
      if (autoSyncRef.current) {
        clearInterval(autoSyncRef.current)
      }
    }
  }, [autoSyncEnabled, syncOrderStatus])

  // Toggle auto-sync
  const toggleAutoSync = () => {
    setAutoSyncEnabled(prev => {
      const newVal = !prev
      toast.success(newVal ? 'Auto-sync ativado (2 min)' : 'Auto-sync desativado')
      return newVal
    })
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/orders/dropshipping')
      if (res.ok) {
        const data = await res.json()
        // Calcular custos e lucro para cada pedido
        const ordersWithCalcs = (data.orders || []).map((order: DropOrder) => {
          const supplierCost = order.items.reduce((acc, item) => {
            const cost = item.product.costPrice || 0
            return acc + (cost * item.quantity)
          }, 0)
          // Incluir impostos de importação no cálculo do lucro
          const importTax = order.importTax || 0
          const icmsTax = order.icmsTax || 0
          const totalTaxes = importTax + icmsTax
          const profit = order.total - supplierCost - (order.shippingCost || 0) - totalTaxes
          return { ...order, supplierCost, profit, importTax, icmsTax }
        })
        setOrders(ordersWithCalcs)
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
    // Filtro de status
    if (filter === 'pending' && order.aliexpressOrderId) return false
    if (filter === 'awaiting_payment' && order.aliexpressStatus !== 'PLACE_ORDER_SUCCESS') return false
    if (filter === 'in_transit' && !['WAIT_BUYER_ACCEPT_GOODS', 'SELLER_PART_SEND_GOODS'].includes(order.aliexpressStatus || '')) return false
    if (filter === 'delivered' && order.aliexpressStatus !== 'FINISH') return false

    // Busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.user.name.toLowerCase().includes(query) ||
        order.user.email.toLowerCase().includes(query) ||
        order.aliexpressOrderId?.toLowerCase().includes(query) ||
        order.supplierTrackingNumber?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Parse do endereço (extrair dados do JSON de shippingAddress)
  const parseAddress = (addressStr: string) => {
    try {
      return JSON.parse(addressStr)
    } catch {
      return { full: addressStr }
    }
  }

  // Toggle seleção
  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  // Selecionar todos pendentes
  const selectAllPending = () => {
    const pending = filteredOrders.filter(o => !o.aliexpressOrderId)
    if (selectedOrders.size === pending.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(pending.map(o => o.id)))
    }
  }

  // Toggle expandir pedido
  const toggleExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  // Buscar opções de frete
  const fetchShippingOptions = async (order: DropOrder) => {
    setSelectedOrderForShipping(order)
    setShowShippingModal(true)
    setLoadingShipping(true)
    setShippingOptions([])

    try {
      const item = order.items[0]
      const productId = item?.product.supplierSku
      if (!productId) {
        toast.error('Produto sem SKU do fornecedor')
        setLoadingShipping(false)
        return
      }

      // Primeiro, buscar informações do produto para obter o skuId
      const productRes = await fetch('/api/admin/orders/test-ds-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      
      let skuId = ''
      if (productRes.ok) {
        const productData = await productRes.json()
        if (productData.skus && productData.skus.length > 0) {
          // Tentar encontrar SKU que corresponde à variante selecionada
          const selectedVariant = item.selectedVariant
          if (selectedVariant && productData.skus.length > 1) {
            const matchingSku = productData.skus.find((sku: any) => 
              sku.skuAttr?.includes(selectedVariant) || sku.name?.includes(selectedVariant)
            )
            skuId = matchingSku?.skuId?.toString() || productData.skus[0]?.skuId?.toString() || ''
          } else {
            skuId = productData.skus[0]?.skuId?.toString() || ''
          }
        }
      }

      if (!skuId) {
        toast.error('Não foi possível obter SKU do produto. Verifique se está na lista DS.')
        setLoadingShipping(false)
        return
      }

      const res = await fetch('/api/admin/orders/shipping-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          skuId,
          quantity: item.quantity,
          country: 'BR',
          address: order.shippingAddress
        })
      })

      if (res.ok) {
        const data = await res.json()
        setShippingOptions(data.options || [])
        if (data.options?.length > 0) {
          setSelectedShipping(data.options[0].code)
        }
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao buscar opções de frete')
      }
    } catch (error) {
      toast.error('Erro ao buscar opções de frete')
    } finally {
      setLoadingShipping(false)
    }
  }

  // Enviar pedido ao fornecedor
  const sendToSupplier = async (orderId: string, shippingMethod?: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    // Parse do endereço para pegar dados
    const address = parseAddress(order.shippingAddress)

    // Validar dados obrigatórios - priorizar dados do endereço de entrega
    const phone = address.phone || order.buyerPhone || order.user.phone
    const cpf = address.cpf || order.buyerCpf || order.user.cpf
    const zipCode = address.zipCode || address.zip || address.postalCode

    if (!phone) {
      toast.error('Telefone do cliente é obrigatório. Verifique o endereço de entrega.')
      return
    }

    if (!cpf) {
      toast.error('CPF do cliente é obrigatório para entregas no Brasil.')
      return
    }

    if (!zipCode) {
      toast.error('CEP do cliente é obrigatório. Verifique o endereço de entrega.')
      return
    }

    setProcessingOrders(prev => new Set(prev).add(orderId))

    try {
      const res = await fetch('/api/admin/orders/send-to-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          shippingMethod: shippingMethod || selectedShipping 
        })
      })

      const data = await res.json()

      if (res.ok) {
        if (data.results?.[0]?.status === 'sent') {
          toast.success(
            <div>
              <strong>Pedido criado no fornecedor!</strong>
              <br />
              <span className="text-sm">ID: {data.results[0].supplierOrderId}</span>
              <br />
              <span className="text-xs text-orange-600">⚠️ Acesse o fornecedor para pagar</span>
            </div>,
            { duration: 8000 }
          )
        } else if (data.results?.[0]?.status === 'error') {
          toast.error(data.results[0].error || 'Erro ao enviar pedido')
        }
        loadOrders()
      } else {
        toast.error(data.message || 'Erro ao enviar pedido')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar pedido')
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
      setShowShippingModal(false)
    }
  }

  // Enviar múltiplos pedidos
  const sendSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Selecione pelo menos um pedido')
      return
    }

    const confirmed = window.confirm(
      `Enviar ${selectedOrders.size} pedido(s) ao fornecedor?\n\n` +
      `Os pedidos serão criados e você precisará pagar no site do fornecedor.`
    )

    if (!confirmed) return

    let success = 0
    let errors = 0

    for (const orderId of selectedOrders) {
      try {
        await sendToSupplier(orderId)
        success++
      } catch {
        errors++
      }
    }

    if (success > 0) {
      toast.success(`${success} pedido(s) enviado(s) com sucesso!`)
    }
    if (errors > 0) {
      toast.error(`${errors} pedido(s) com erro`)
    }

    setSelectedOrders(new Set())
    loadOrders()
  }

  // Abrir link de pagamento no fornecedor
  const openPaymentLink = (order: DropOrder) => {
    // Verificar se tem URL do fornecedor configurada no produto
    const supplierUrl = order.items?.[0]?.product?.supplierUrl
    
    if (supplierUrl) {
      window.open(supplierUrl, '_blank')
    } else if (order.aliexpressOrderId) {
      // Fallback para busca genérica do pedido
      window.open(`https://www.google.com/search?q=${order.aliexpressOrderId}`, '_blank')
    } else {
      toast.error('Pedido não foi enviado ao fornecedor ainda')
    }
  }

  // Buscar eventos de rastreamento
  const fetchTrackingEvents = async (order: DropOrder) => {
    if (!order.aliexpressOrderId) {
      toast.error('Pedido não tem ID do fornecedor')
      return
    }

    setTrackingOrder(order)
    setShowTrackingModal(true)
    setLoadingTracking(true)
    setTrackingEvents([])
    setTrackingInfo(null)

    try {
      const res = await fetch('/api/orders/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: order.aliexpressOrderId,
          trackingNumber: order.supplierTrackingNumber 
        })
      })
      const data = await res.json()

      if (data.success && data.tracking) {
        setTrackingInfo(data.tracking)
        setTrackingEvents(data.tracking.events || [])
      } else {
        toast.error(data.error || 'Erro ao buscar rastreamento')
      }
    } catch (error) {
      console.error('Erro ao buscar tracking:', error)
      toast.error('Erro ao buscar rastreamento')
    } finally {
      setLoadingTracking(false)
    }
  }

  // Copiar para clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  // Estatísticas
  const stats = {
    total: orders.length,
    pending: orders.filter(o => !o.aliexpressOrderId).length,
    awaitingPayment: orders.filter(o => o.aliexpressStatus === 'PLACE_ORDER_SUCCESS').length,
    inTransit: orders.filter(o => ['WAIT_BUYER_ACCEPT_GOODS', 'SELLER_PART_SEND_GOODS'].includes(o.aliexpressStatus || '')).length,
    delivered: orders.filter(o => o.aliexpressStatus === 'FINISH').length,
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/pedidos" className="p-2 hover:bg-gray-100 rounded-lg">
                <FiChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Central de Pedidos Dropshipping</h1>
                <p className="text-sm text-gray-500">Gerencie pedidos para fornecedores</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-sync toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <button
                  onClick={toggleAutoSync}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    autoSyncEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  title={autoSyncEnabled ? 'Desativar auto-sync' : 'Ativar auto-sync'}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      autoSyncEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div className="text-xs">
                  <div className={`font-medium flex items-center gap-1 ${autoSyncEnabled ? 'text-green-700' : 'text-gray-500'}`}>
                    {syncing ? (
                      <><FiRefreshCw className="animate-spin" size={12} /> Sincronizando...</>
                    ) : autoSyncEnabled ? (
                      <><FiZap size={12} /> Auto-sync</>
                    ) : (
                      <><FiPause size={12} /> Pausado</>
                    )}
                  </div>
                  {lastSyncTime && (
                    <div className="text-gray-400">
                      {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {syncStats?.updated ? ` (${syncStats.updated} ↑)` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Manual sync button */}
              <button
                onClick={() => syncOrderStatus(false)}
                disabled={syncing}
                className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"
                title="Sincronizar status agora"
              >
                <FiRefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
              </button>

              {selectedOrders.size > 0 && (
                <button
                  onClick={sendSelectedOrders}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 font-medium"
                >
                  <FiSend size={16} />
                  Enviar {selectedOrders.size} Selecionado(s)
                </button>
              )}
              <button
                onClick={loadOrders}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Recarregar lista"
              >
                <FiPackage size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl border-2 transition ${filter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`p-4 rounded-xl border-2 transition ${filter === 'pending' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pendentes</div>
          </button>
          <button
            onClick={() => setFilter('awaiting_payment')}
            className={`p-4 rounded-xl border-2 transition ${filter === 'awaiting_payment' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="text-2xl font-bold text-orange-600">{stats.awaitingPayment}</div>
            <div className="text-sm text-gray-500">Aguardando Pagamento</div>
          </button>
          <button
            onClick={() => setFilter('in_transit')}
            className={`p-4 rounded-xl border-2 transition ${filter === 'in_transit' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="text-2xl font-bold text-cyan-600">{stats.inTransit}</div>
            <div className="text-sm text-gray-500">Em Trânsito</div>
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`p-4 rounded-xl border-2 transition ${filter === 'delivered' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-sm text-gray-500">Entregues</div>
          </button>
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, cliente, ID Fornecedor ou rastreio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={selectAllPending}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              {selectedOrders.size > 0 ? <FiCheckSquare /> : <FiSquare />}
              Selecionar Pendentes ({stats.pending})
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <FiPackage size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum pedido encontrado</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const statusConfig = STATUS_CONFIG[order.aliexpressStatus || 'PENDING'] || STATUS_CONFIG['PENDING']
              const isExpanded = expandedOrders.has(order.id)
              const isSelected = selectedOrders.has(order.id)
              const isProcessing = processingOrders.has(order.id)
              const address = parseAddress(order.shippingAddress)
              const needsPayment = order.aliexpressStatus === 'PLACE_ORDER_SUCCESS'

              return (
                <div 
                  key={order.id} 
                  className={`bg-white rounded-xl border overflow-hidden transition ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
                >
                  {/* Order Header */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Checkbox */}
                    {!order.aliexpressOrderId && (
                      <button
                        onClick={() => toggleOrderSelection(order.id)}
                        className="text-gray-400 hover:text-blue-500"
                      >
                        {isSelected ? <FiCheckSquare size={20} className="text-blue-500" /> : <FiSquare size={20} />}
                      </button>
                    )}

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-900">#{formatOrderNumber(order.orderNumber)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        {needsPayment && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
                            💰 Pagar Agora
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiUser size={14} />
                          {order.user.name}
                        </span>
                        <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                        <span className="font-medium text-gray-900">
                          R$ {order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Products Preview */}
                    <div className="hidden md:flex items-center gap-2">
                      {order.items.slice(0, 3).map((item, idx) => {
                        const images = JSON.parse(item.product.images || '[]')
                        return (
                          <img
                            key={idx}
                            src={images[0] || '/placeholder.png'}
                            alt=""
                            className="w-12 h-12 object-cover rounded-lg border"
                          />
                        )
                      })}
                      {order.items.length > 3 && (
                        <span className="text-sm text-gray-500">+{order.items.length - 3}</span>
                      )}
                    </div>

                    {/* ID do Fornecedor */}
                    <div className="text-right hidden lg:block">
                      {order.aliexpressOrderId ? (
                        <div>
                          <div className="text-xs text-gray-500">ID Fornecedor</div>
                          <div className="flex items-center gap-1">
                            <code className="text-sm font-mono">{order.aliexpressOrderId}</code>
                            <button
                              onClick={() => copyToClipboard(order.aliexpressOrderId!, 'ID')}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <FiCopy size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </div>

                    {/* Tracking */}
                    <div className="text-right hidden lg:block min-w-[120px]">
                      {order.supplierTrackingNumber ? (
                        <div>
                          <div className="text-xs text-gray-500">Rastreio</div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => fetchTrackingEvents(order)}
                              className="text-sm font-mono text-green-600 hover:text-green-800 hover:underline cursor-pointer"
                              title="Ver eventos de rastreamento"
                            >
                              {order.supplierTrackingNumber}
                            </button>
                            <button
                              onClick={() => copyToClipboard(order.supplierTrackingNumber!, 'Rastreio')}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <FiCopy size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">Sem rastreio</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!order.aliexpressOrderId ? (
                        <>
                          <button
                            onClick={() => fetchShippingOptions(order)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 font-medium disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <FiRefreshCw className="animate-spin" size={16} />
                            ) : (
                              <FiSend size={16} />
                            )}
                            Enviar
                          </button>
                        </>
                      ) : needsPayment ? (
                        <button
                          onClick={() => openPaymentLink(order)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 font-medium"
                        >
                          <FiCreditCard size={16} />
                          Pagar
                        </button>
                      ) : (
                        <button
                          onClick={() => openPaymentLink(order)}
                          className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                          <FiExternalLink size={16} />
                          Ver no Fornecedor
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4">
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Cliente e Endereço */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FiMapPin size={16} />
                            Endereço de Entrega
                          </h4>
                          <div className="bg-white rounded-lg p-3 text-sm space-y-1">
                            <div className="font-medium">{order.user.name}</div>
                            <div>{address.street || address.address1} {address.streetNumber || ''}</div>
                            {address.complement && <div>{address.complement}</div>}
                            <div>{address.district || address.neighborhood}</div>
                            <div>{address.city} - {address.state || address.provinceName}</div>
                            <div>CEP: {address.zipCode || address.zip || address.postalCode || <span className="text-red-500">⚠️ Sem CEP</span>}</div>
                            <div className="pt-2 border-t mt-2">
                              <div className="flex items-center gap-2">
                                <FiPhone size={12} />
                                {address.phone || order.buyerPhone || order.user.phone || <span className="text-red-500">⚠️ Sem telefone</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <FiMail size={12} />
                                {order.user.email}
                              </div>
                              <div className="flex items-center gap-2">
                                CPF: {address.cpf || order.buyerCpf || order.user.cpf || <span className="text-red-500">⚠️ Sem CPF</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Produtos */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FiPackage size={16} />
                            Produtos ({order.items.length})
                          </h4>
                          <div className="space-y-2">
                            {order.items.map(item => {
                              const images = JSON.parse(item.product.images || '[]')
                              return (
                                <div key={item.id} className="bg-white rounded-lg p-3 flex gap-3">
                                  <img
                                    src={images[0] || '/placeholder.png'}
                                    alt=""
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{item.product.name}</div>
                                    {item.selectedVariant && (
                                      <div className="text-xs text-gray-500">{item.selectedVariant}</div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      SKU: {item.product.supplierSku || 'N/A'}
                                    </div>
                                    <div className="text-sm mt-1">
                                      {item.quantity}x R$ {item.price.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Financeiro */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FiDollarSign size={16} />
                            Resumo Financeiro
                          </h4>
                          <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Venda:</span>
                              <span className="font-medium">R$ {order.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Custo Fornecedor:</span>
                              <span className="text-red-600">- R$ {(order.supplierCost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Frete Fornecedor:</span>
                              <span className="text-red-600">- R$ {(order.shippingCost || 0).toFixed(2)}</span>
                            </div>
                            {((order.importTax || 0) > 0 || (order.icmsTax || 0) > 0) && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Imposto Importação (20%):</span>
                                  <span className="text-red-600">- R$ {(order.importTax || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">ICMS:</span>
                                  <span className="text-red-600">- R$ {(order.icmsTax || 0).toFixed(2)}</span>
                                </div>
                              </>
                            )}
                            <div className="border-t pt-2 flex justify-between font-bold">
                              <span>Lucro Estimado:</span>
                              <span className={order.profit && order.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                                R$ {(order.profit || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {order.supplierOrderData && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                              <div className="font-medium text-blue-800 mb-1">Dados do Fornecedor</div>
                              {order.supplierOrderData.paymentUrl && (
                                <a
                                  href={order.supplierOrderData.paymentUrl}
                                  target="_blank"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <FiCreditCard size={14} />
                                  Link de Pagamento
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Shipping Options Modal */}
      {showShippingModal && selectedOrderForShipping && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Selecionar Frete</h3>
              <button onClick={() => setShowShippingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingShipping ? (
                <div className="text-center py-8">
                  <FiRefreshCw className="animate-spin mx-auto text-2xl text-gray-400 mb-2" />
                  <p className="text-gray-500">Buscando opções de frete...</p>
                </div>
              ) : shippingOptions.length === 0 ? (
                <div className="text-center py-8">
                  <FiInfo className="mx-auto text-2xl text-yellow-500 mb-2" />
                  <p className="text-gray-600 mb-4">
                    Não foi possível consultar as opções de frete.
                  </p>
                  <p className="text-sm text-gray-500">
                    O pedido será enviado com o método de frete padrão (mais barato disponível).
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shippingOptions.map(option => (
                    <label
                      key={option.code}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedShipping === option.code ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={option.code}
                        checked={selectedShipping === option.code}
                        onChange={() => setSelectedShipping(option.code)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{option.company}</div>
                        <div className="text-sm text-gray-500">{option.deliveryDays}</div>
                      </div>
                      <div className={`font-bold ${option.isFree ? 'text-green-600' : 'text-gray-900'}`}>
                        {option.isFree ? 'GRÁTIS' : option.costFormatted}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowShippingModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => sendToSupplier(selectedOrderForShipping.id)}
                disabled={processingOrders.has(selectedOrderForShipping.id)}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingOrders.has(selectedOrderForShipping.id) ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiSend />
                )}
                Criar Pedido no Fornecedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Events Modal */}
      {showTrackingModal && trackingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Rastreamento do Pedido</h3>
                <p className="text-sm text-gray-500">#{trackingOrder.orderNumber}</p>
              </div>
              <button onClick={() => setShowTrackingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingTracking ? (
                <div className="text-center py-8">
                  <FiRefreshCw className="animate-spin mx-auto text-2xl text-gray-400 mb-2" />
                  <p className="text-gray-500">Buscando eventos de rastreamento...</p>
                </div>
              ) : (
                <>
                  {/* Info do rastreio */}
                  {trackingInfo && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Código de Rastreio</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-green-600">{trackingInfo.trackingNumber}</code>
                          <button
                            onClick={() => copyToClipboard(trackingInfo.trackingNumber, 'Código')}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <FiCopy size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Transportadora</span>
                        <span className="font-medium">{trackingInfo.carrier || 'Fornecedor'}</span>
                      </div>
                      {trackingInfo.currentStatus && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">Status</span>
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium">
                            {trackingInfo.currentStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline de eventos */}
                  {trackingEvents.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      <div className="space-y-4">
                        {trackingEvents.map((event, index) => (
                          <div key={index} className="relative pl-10">
                            <div className={`absolute left-2 w-4 h-4 rounded-full border-2 ${index === 0 ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}></div>
                            <div className={`p-3 rounded-lg ${index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                              <p className={`font-medium ${index === 0 ? 'text-green-800' : 'text-gray-800'}`}>
                                {event.eventDescription}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                <FiClock size={12} />
                                <span>{event.eventTime ? new Date(event.eventTime).toLocaleString('pt-BR') : '-'}</span>
                              </div>
                              {event.eventLocation && (
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                  <FiMapPin size={12} />
                                  <span>{event.eventLocation}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FiTruck className="mx-auto text-4xl text-gray-300 mb-3" />
                      <p className="text-gray-500">Nenhum evento de rastreamento ainda</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Os eventos aparecerão quando o vendedor enviar o produto
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  if (trackingOrder?.supplierUrl) {
                    window.open(trackingOrder.supplierUrl, '_blank')
                  } else if (trackingOrder?.aliexpressOrderId) {
                    window.open(`https://www.17track.net/pt/track#nums=${trackingOrder.supplierTrackingNumber || trackingOrder.aliexpressOrderId}`, '_blank')
                  }
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2"
              >
                <FiExternalLink size={16} />
                Ver Rastreio
              </button>
              <button
                onClick={() => setShowTrackingModal(false)}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
