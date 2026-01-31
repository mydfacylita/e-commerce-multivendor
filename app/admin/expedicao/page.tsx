'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Truck, CheckCircle, Clock, Search, 
  Printer, Box, AlertCircle, ChevronDown, ChevronUp,
  User, MapPin, Phone, Mail, RefreshCw, Filter, FileText, XCircle, Tag
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatOrderNumber } from '@/lib/order'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  selectedSize?: string
  selectedColor?: string
  product: {
    id: string
    name: string
    images: string
    weight?: number
    length?: number
    width?: number
    height?: number
  }
}

interface Order {
  id: string
  status: string
  total: number
  shippingCost: number
  shippingAddress: string
  shippingMethod?: string
  shippingService?: string
  shippingCarrier?: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  trackingCode?: string
  createdAt: string
  paymentApprovedAt?: string
  separatedAt?: string
  packedAt?: string
  shippedAt?: string
  packagingBoxId?: string
  expeditionNotes?: string
  items: OrderItem[]
  invoices?: {
    id: string
    invoiceNumber?: string
    status: string
    pdfUrl?: string
    errorMessage?: string
  }[]
  packagingBox?: {
    id: string
    code: string
    name: string
    innerLength: number
    innerWidth: number
    innerHeight: number
    outerLength: number
    outerWidth: number
    outerHeight: number
    maxWeight: number
  }
}

interface Embalagem {
  id: string
  code: string
  name: string
  type: string
  innerLength: number
  innerWidth: number
  innerHeight: number
  outerLength: number
  outerWidth: number
  outerHeight: number
  maxWeight: number
}

type ExpeditionStatus = 'all' | 'pending' | 'separated' | 'packed' | 'shipped'

export default function ExpedicaoPage() {
  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ExpeditionStatus>('pending')
  const [search, setSearch] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [processingOrder, setProcessingOrder] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedCarrier, setSelectedCarrier] = useState<string>('')
  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/expedicao?status=${filter}&search=${search}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  const loadEmbalagens = async () => {
    try {
      const res = await fetch('/api/admin/embalagens')
      if (res.ok) {
        const data = await res.json()
        setEmbalagens(data.filter((e: Embalagem) => e.type))
      }
    } catch (error) {
      console.error('Erro ao carregar embalagens:', error)
    }
  }

  // Obter informações da transportadora
  const getShippingBadge = (order: Order) => {
    const method = order.shippingMethod?.toLowerCase() || 'propria'
    const service = order.shippingService || ''
    
    switch (method) {
      case 'correios':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
            📮 Correios {service && `- ${service}`}
          </span>
        )
      case 'jadlog':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1">
            🚚 Jadlog {service && `- ${service}`}
          </span>
        )
      case 'melhorenvio':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
            📦 Melhor Envio {service && `- ${service}`}
          </span>
        )
      case 'propria':
      case 'local':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1">
            🚗 Entrega Própria
          </span>
        )
      case 'retirada':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 flex items-center gap-1">
            🏪 Retirada
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
            📦 {order.shippingCarrier || method || 'Frete'}
          </span>
        )
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    loadOrders()
    loadEmbalagens()
  }, [loadOrders, mounted])

  useEffect(() => {
    if (!mounted) return
    const timer = setTimeout(() => {
      loadOrders()
    }, 500)
    return () => clearTimeout(timer)
  }, [search, loadOrders, mounted])

  const getStatusBadge = (order: Order) => {
    if (order.shippedAt) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">📦 Despachado</span>
    }
    if (order.packedAt) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">📋 Embalado</span>
    }
    if (order.separatedAt) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">✅ Separado</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">⏳ Aguardando</span>
  }

  const parseAddress = (addressJson: string) => {
    try {
      return JSON.parse(addressJson)
    } catch {
      return { street: addressJson }
    }
  }

  const calculateOrderDimensions = (items: OrderItem[]) => {
    let totalWeight = 0
    let maxLength = 0
    let maxWidth = 0
    let totalHeight = 0

    items.forEach(item => {
      const qty = item.quantity || 1
      totalWeight += (item.product.weight || 0.3) * qty
      maxLength = Math.max(maxLength, item.product.length || 16)
      maxWidth = Math.max(maxWidth, item.product.width || 11)
      totalHeight += (item.product.height || 5) * qty
    })

    return { weight: totalWeight, length: maxLength, width: maxWidth, height: totalHeight }
  }

  const suggestPackaging = (items: OrderItem[]) => {
    const dims = calculateOrderDimensions(items)
    
    // Encontrar embalagem que cabe
    const suitable = embalagens.filter(e => {
      return e.innerLength >= dims.length &&
             e.innerWidth >= dims.width &&
             e.innerHeight >= dims.height &&
             e.maxWeight >= dims.weight
    }).sort((a, b) => {
      // Ordenar por menor volume (mais econômica)
      const volA = a.innerLength * a.innerWidth * a.innerHeight
      const volB = b.innerLength * b.innerWidth * b.innerHeight
      return volA - volB
    })

    return suitable[0] || null
  }

  const handleSeparar = async (orderId: string) => {
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/expedicao/${orderId}/separar`, { method: 'POST' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pedido marcado como separado!' })
        loadOrders()
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.message || 'Erro ao separar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao processar' })
    } finally {
      setProcessingOrder(null)
    }
  }

  // Selecionar embalagem sem marcar como embalado
  const handleSelecionarEmbalagem = async (orderId: string, packagingBoxId: string) => {
    if (!packagingBoxId) return
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/expedicao/${orderId}/selecionar-embalagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packagingBoxId })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Embalagem selecionada!' })
        loadOrders()
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.message || 'Erro ao selecionar embalagem' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao processar' })
    } finally {
      setProcessingOrder(null)
    }
  }

  // Confirmar embalagem (marcar como embalado)
  const handleEmbalar = async (orderId: string, packagingBoxId: string) => {
    if (!packagingBoxId) {
      setMessage({ type: 'error', text: 'Selecione uma embalagem primeiro' })
      return
    }
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/expedicao/${orderId}/embalar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packagingBoxId })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pedido embalado!' })
        loadOrders()
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.message || 'Erro ao embalar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao processar' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleDespachar = async (orderId: string, trackingCode: string) => {
    if (!trackingCode.trim()) {
      setMessage({ type: 'error', text: 'Código de rastreio é obrigatório' })
      return
    }
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/expedicao/${orderId}/despachar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingCode })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pedido despachado!' })
        loadOrders()
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.message || 'Erro ao despachar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao processar' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleEmitirNFe = async (orderId: string) => {
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/expedicao/${orderId}/emitir-nfe`, { 
        method: 'POST' 
      })
      if (res.ok) {
        const data = await res.json()
        setMessage({ 
          type: 'success', 
          text: `NF-e emitida com sucesso! Nº ${data.invoice?.number || ''}` 
        })
        loadOrders()
      } else {
        const error = await res.json()
        setMessage({ 
          type: 'error', 
          text: error.error || 'Erro ao emitir NF-e' 
        })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao processar emissão de NF-e' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const handlePrintLabel = async (orderId: string) => {
    window.open(`/api/admin/expedicao/${orderId}/etiqueta`, '_blank')
  }

  const handleGerarEtiquetaCorreios = async (orderId: string) => {
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/expedicao/${orderId}/gerar-etiqueta-correios`, {
        method: 'POST'
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        setMessage({ 
          type: 'success', 
          text: `Etiqueta gerada! Código: ${data.codigoRastreio}` 
        })
        loadOrders()
        // Abrir etiqueta para impressão
        setTimeout(() => {
          window.open(`/api/admin/expedicao/${orderId}/etiqueta`, '_blank')
        }, 500)
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao gerar etiqueta' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao gerar etiqueta dos Correios' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleGerarEtiquetaPropria = async (orderId: string, packagingBoxId: string) => {
    setProcessingOrder(orderId)
    try {
      // Primeiro confirmar embalagem
      const embalarRes = await fetch(`/api/admin/expedicao/${orderId}/embalar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packagingBoxId })
      })
      
      if (!embalarRes.ok) {
        const errData = await embalarRes.json()
        throw new Error(errData.error || 'Erro ao embalar')
      }

      // Abrir etiqueta para impressão (usa LabelService que detecta entrega própria)
      window.open(`/api/admin/expedicao/${orderId}/etiqueta`, '_blank')
      
      setMessage({ type: 'success', text: 'Etiqueta gerada! Pedido movido para Embalados.' })
      loadOrders()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao gerar etiqueta própria' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const handlePrintSeparationGuide = () => {
    window.open(`/api/admin/expedicao/guia-separacao?status=${filter}`, '_blank')
  }

  const handlePrintCollectionGuide = (carrier?: string) => {
    const params = new URLSearchParams({ status: 'packed' })
    if (carrier) {
      params.set('carrier', carrier)
    }
    window.open(`/api/admin/expedicao/guia-coleta?${params.toString()}`, '_blank')
    setShowCarrierDropdown(false)
  }

  // Obter lista de transportadoras únicas dos pedidos embalados
  const getAvailableCarriers = () => {
    const carriers = new Set<string>()
    orders.forEach(order => {
      if (order.shippingCarrier || order.shippingMethod) {
        carriers.add(order.shippingCarrier || order.shippingMethod || '')
      }
    })
    return Array.from(carriers).filter(c => c).sort()
  }

  const totalItems = (items: OrderItem[]) => items.reduce((acc, item) => acc + item.quantity, 0)

  const tabs = [
    { id: 'pending' as ExpeditionStatus, label: 'Pendentes', icon: Clock, color: 'orange' },
    { id: 'separated' as ExpeditionStatus, label: 'Separados', icon: CheckCircle, color: 'yellow' },
    { id: 'packed' as ExpeditionStatus, label: 'Embalados', icon: Box, color: 'blue' },
    { id: 'shipped' as ExpeditionStatus, label: 'Despachados', icon: Truck, color: 'green' },
    { id: 'all' as ExpeditionStatus, label: 'Todos', icon: Filter, color: 'gray' },
  ]

  if (!mounted || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6" suppressHydrationWarning>
      {/* Cabeçalho */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-8 h-8" />
            Expedição e Separação
          </h1>
          <p className="text-gray-600 mt-1">Gerencie a separação e envio dos pedidos</p>
        </div>
        <Link 
          href="/admin/expedicao/etiquetas"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Tag className="w-4 h-4" />
          Gestão de Etiquetas
        </Link>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">×</button>
        </div>
      )}

      {/* Container com Abas */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Navegação por Abas */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4">
            {/* Abas */}
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = filter === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`
                      relative flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? `text-${tab.color}-600 border-b-2 border-${tab.color}-500` 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }
                    `}
                    style={isActive ? { 
                      borderBottomColor: tab.color === 'orange' ? '#f97316' : 
                                         tab.color === 'yellow' ? '#eab308' : 
                                         tab.color === 'blue' ? '#3b82f6' : 
                                         tab.color === 'green' ? '#22c55e' : '#374151',
                      color: tab.color === 'orange' ? '#ea580c' : 
                             tab.color === 'yellow' ? '#ca8a04' : 
                             tab.color === 'blue' ? '#2563eb' : 
                             tab.color === 'green' ? '#16a34a' : '#374151'
                    } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {isActive && (
                      <span 
                        className="ml-2 px-2 py-0.5 text-xs rounded-full bg-opacity-20"
                        style={{ 
                          backgroundColor: tab.color === 'orange' ? '#fed7aa' : 
                                           tab.color === 'yellow' ? '#fef08a' : 
                                           tab.color === 'blue' ? '#bfdbfe' : 
                                           tab.color === 'green' ? '#bbf7d0' : '#e5e7eb',
                          color: tab.color === 'orange' ? '#c2410c' : 
                                 tab.color === 'yellow' ? '#a16207' : 
                                 tab.color === 'blue' ? '#1d4ed8' : 
                                 tab.color === 'green' ? '#15803d' : '#374151'
                        }}
                      >
                        {orders.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Ações do lado direito */}
            <div className="flex items-center gap-3 py-2">
              <button
                onClick={loadOrders}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Atualizar lista"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {filter === 'pending' && (
                <button
                  onClick={handlePrintSeparationGuide}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
                  title="Imprimir guia de separação"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Guia de Separação</span>
                </button>
              )}
              {filter === 'packed' && (
                <div className="relative">
                  <button
                    onClick={() => setShowCarrierDropdown(!showCarrierDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
                    title="Imprimir guia de coleta"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Imprimir Guia de Coleta</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showCarrierDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() => handlePrintCollectionGuide()}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Truck className="w-4 h-4 text-gray-500" />
                          Todas as Transportadoras
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        {getAvailableCarriers().map(carrier => (
                          <button
                            key={carrier}
                            onClick={() => handlePrintCollectionGuide(carrier)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Box className="w-4 h-4 text-green-500" />
                            {carrier}
                          </button>
                        ))}
                        {getAvailableCarriers().length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-400 italic">
                            Nenhuma transportadora encontrada
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Busca */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ID, cliente ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Conteúdo da Aba - Lista de Pedidos */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300" />
              <p className="mt-4 text-gray-600">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const address = parseAddress(order.shippingAddress)
                const dims = calculateOrderDimensions(order.items)
                const suggestedPackaging = suggestPackaging(order.items)
                const isExpanded = expandedOrder === order.id

                return (
                  <div key={order.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
                    {/* Header do Pedido */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-100"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{formatOrderNumber(order.id)}</span>
                              {getStatusBadge(order)}
                              {getShippingBadge(order)}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm text-gray-500">{totalItems(order.items)} itens</div>
                            <div className="font-bold text-lg">R$ {order.total.toFixed(2)}</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Peso Total</div>
                            <div className="font-semibold">{dims.weight.toFixed(2)} kg</div>
                          </div>

                          {/* Embalagem Utilizada ou Sugerida */}
                          {order.packagingBox ? (
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Embalagem Utilizada</div>
                              <div className="font-semibold text-green-600">{order.packagingBox.code}</div>
                              <div className="text-xs text-gray-400">
                                {order.packagingBox.innerLength}x{order.packagingBox.innerWidth}x{order.packagingBox.innerHeight}cm
                              </div>
                            </div>
                          ) : suggestedPackaging && (
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Embalagem Sugerida</div>
                              <div className="font-semibold text-blue-600">{suggestedPackaging.code}</div>
                            </div>
                          )}

                          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                      </div>
                    </div>

                    {/* Detalhes Expandidos */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Produtos */}
                          <div className="lg:col-span-2">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <Package className="w-5 h-5" /> Produtos para Separar
                            </h3>
                            <div className="space-y-2">
                              {order.items.map((item) => {
                                let images: string[] = []
                                try {
                                  images = JSON.parse(item.product.images)
                                } catch {
                                  images = [item.product.images]
                                }

                                return (
                                  <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden">
                                      {images[0] && (
                                        <Image
                                          src={images[0]}
                                          alt={item.product.name}
                                          fill
                                          className="object-cover"
                                        />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium">{item.product.name}</div>
                                      <div className="text-sm text-gray-500">
                                        {item.selectedSize && <span className="mr-2">Tam: {item.selectedSize}</span>}
                                        {item.selectedColor && <span>Cor: {item.selectedColor}</span>}
                                      </div>
                                      <div className="text-sm text-gray-400">
                                        {item.product.weight || 0.3}kg | {item.product.length || 16}x{item.product.width || 11}x{item.product.height || 5}cm
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-blue-600">{item.quantity}x</div>
                                      <div className="text-sm text-gray-500">R$ {item.price.toFixed(2)}</div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Dimensões Totais */}
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <div className="text-sm font-semibold text-blue-800">📦 Dimensões do Pacote</div>
                              <div className="flex gap-6 mt-2 text-sm">
                                <span><strong>Peso:</strong> {dims.weight.toFixed(2)}kg</span>
                                <span><strong>Comprimento:</strong> {dims.length}cm</span>
                                <span><strong>Largura:</strong> {dims.width}cm</span>
                                <span><strong>Altura:</strong> {dims.height}cm</span>
                              </div>
                            </div>
                          </div>

                          {/* Destinatário e Ações */}
                          <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <User className="w-5 h-5" /> Destinatário
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{order.buyerName}</span>
                              </div>
                              {order.buyerPhone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <span>{order.buyerPhone}</span>
                                </div>
                              )}
                              {order.buyerEmail && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm">{order.buyerEmail}</span>
                                </div>
                              )}
                              <hr className="my-2" />
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                                <div className="text-sm">
                                  <div>{address.street}, {address.number}</div>
                                  {address.complement && <div>{address.complement}</div>}
                                  <div>{address.neighborhood}</div>
                                  <div>{address.city} - {address.state}</div>
                                  <div className="font-semibold">CEP: {address.zipCode}</div>
                                </div>
                              </div>
                            </div>

                            {/* Ações de Expedição */}
                            <div className="mt-4 space-y-3">
                              {/* Separar */}
                              {!order.separatedAt && (
                                <button
                                  onClick={() => handleSeparar(order.id)}
                                  disabled={processingOrder === order.id}
                                  className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                  Marcar como Separado
                                </button>
                              )}

                              {/* NF-e - Entre Separado e Embalado */}
                              {order.separatedAt && !order.packedAt && (
                                <>
                                  {order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' ? (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="w-5 h-5 text-green-600" />
                                          <div>
                                            <div className="font-semibold text-green-800">NF-e Emitida</div>
                                            {order.invoices[0].invoiceNumber && (
                                              <div className="text-sm text-green-600">
                                                Nº {order.invoices[0].invoiceNumber}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          {order.invoices[0].pdfUrl && (
                                            <a
                                              href={order.invoices[0].pdfUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm text-green-600 hover:text-green-700 underline"
                                            >
                                              Ver PDF
                                            </a>
                                          )}
                                          <button
                                            onClick={() => window.open(`/api/admin/invoices/${order.invoices?.[0]?.id}/danfe`, '_blank')}
                                            className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1"
                                          >
                                            <Printer className="w-4 h-4" />
                                            DANFE
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : order.invoices && order.invoices.length > 0 && order.invoices[0].status === 'ERROR' ? (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <XCircle className="w-5 h-5 text-red-600" />
                                          <div>
                                            <div className="font-semibold text-red-800">Erro na NF-e</div>
                                            <div className="text-sm text-red-600">
                                              {order.invoices[0].errorMessage?.substring(0, 100) || 'Erro na emissão'}...
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleEmitirNFe(order.id)}
                                        disabled={processingOrder === order.id}
                                        className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                      >
                                        <FileText className="w-4 h-4" />
                                        Tentar Novamente
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleEmitirNFe(order.id)}
                                      disabled={processingOrder === order.id}
                                      className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                      <FileText className="w-5 h-5" />
                                      Emitir NF-e
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Embalar - Só habilitar se tiver NF-e EMITIDA com sucesso */}
                              {order.separatedAt && !order.packedAt && order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' && (
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium">1. Selecionar Embalagem:</label>
                                  <select
                                    id={`embalagem-${order.id}`}
                                    className="w-full p-2 border rounded-lg"
                                    onChange={(e) => handleSelecionarEmbalagem(order.id, e.target.value)}
                                    disabled={processingOrder === order.id}
                                    defaultValue={order.packagingBoxId || ''}
                                  >
                                    <option value="" disabled>Escolha a embalagem...</option>
                                    {embalagens.map((emb) => (
                                      <option 
                                        key={emb.id} 
                                        value={emb.id}
                                        className={suggestedPackaging?.id === emb.id ? 'bg-green-100' : ''}
                                      >
                                        {emb.code} - {emb.name} ({emb.innerLength}x{emb.innerWidth}x{emb.innerHeight}cm)
                                        {suggestedPackaging?.id === emb.id ? ' ⭐ Sugerida' : ''}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Se embalagem selecionada, mostrar próximo passo baseado no método de envio */}
                                  {order.packagingBoxId && (
                                    <>
                                      {/* CORREIOS - Gerar etiqueta */}
                                      {(order.shippingMethod === 'correios' || order.shippingCarrier === 'correios') && !order.trackingCode && (
                                        <>
                                          <label className="block text-sm font-medium mt-3">2. Gerar Etiqueta:</label>
                                          <button
                                            onClick={() => handleGerarEtiquetaCorreios(order.id)}
                                            disabled={processingOrder === order.id}
                                            className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                                          >
                                            {processingOrder === order.id ? (
                                              <><RefreshCw className="w-5 h-5 animate-spin" /> Gerando...</>
                                            ) : (
                                              <><Printer className="w-5 h-5" /> 📮 Gerar Etiqueta Correios</>
                                            )}
                                          </button>
                                        </>
                                      )}

                                      {/* OUTROS (Entrega Própria, etc) - Gerar etiqueta própria e embalar */}
                                      {!(order.shippingMethod === 'correios' || order.shippingCarrier === 'correios') &&
                                       !(order.shippingMethod === 'jadlog' || order.shippingCarrier === 'jadlog') &&
                                       !(order.shippingMethod === 'melhorenvio' || order.shippingCarrier === 'melhorenvio') && (
                                        <>
                                          <label className="block text-sm font-medium mt-3">2. Gerar Etiqueta:</label>
                                          <button
                                            onClick={() => handleGerarEtiquetaPropria(order.id, order.packagingBoxId!)}
                                            disabled={processingOrder === order.id}
                                            className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                          >
                                            {processingOrder === order.id ? (
                                              <><RefreshCw className="w-5 h-5 animate-spin" /> Gerando...</>
                                            ) : (
                                              <><Printer className="w-5 h-5" /> 🚗 Gerar Etiqueta Própria</>
                                            )}
                                          </button>
                                        </>
                                      )}

                                      {/* JADLOG - Gerar etiqueta Jadlog - TODO: Implementar */}
                                      {/* (order.shippingMethod === 'jadlog' || order.shippingCarrier === 'jadlog') && !order.trackingCode && (
                                        <>
                                          <label className="block text-sm font-medium mt-3">2. Gerar Etiqueta:</label>
                                          <button
                                            onClick={() => console.log('Jadlog não implementado')}
                                            disabled={processingOrder === order.id}
                                            className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                                          >
                                            {processingOrder === order.id ? (
                                              <><RefreshCw className="w-5 h-5 animate-spin" /> Gerando...</>
                                            ) : (
                                              <><Printer className="w-5 h-5" /> 🚚 Gerar Etiqueta Jadlog</>
                                            )}
                                          </button>
                                        </>
                                      ) */}

                                      {/* MELHOR ENVIO - Gerar etiqueta Melhor Envio - TODO: Implementar */}
                                      {/* (order.shippingMethod === 'melhorenvio' || order.shippingCarrier === 'melhorenvio') && !order.trackingCode && (
                                        <>
                                          <label className="block text-sm font-medium mt-3">2. Gerar Etiqueta:</label>
                                          <button
                                            onClick={() => console.log('Melhor Envio não implementado')}
                                            disabled={processingOrder === order.id}
                                            className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                                          >
                                            {processingOrder === order.id ? (
                                              <><RefreshCw className="w-5 h-5 animate-spin" /> Gerando...</>
                                            ) : (
                                              <><Printer className="w-5 h-5" /> 📦 Gerar Etiqueta Melhor Envio</>
                                            )}
                                          </button>
                                        </>
                                      ) */}

                                      {/* Confirmar Embalagem - Só para Correios/Jadlog/ME que já tem código de rastreio */}
                                      {order.trackingCode && (order.shippingMethod === 'correios' || order.shippingCarrier === 'correios' ||
                                        order.shippingMethod === 'jadlog' || order.shippingCarrier === 'jadlog' ||
                                        order.shippingMethod === 'melhorenvio' || order.shippingCarrier === 'melhorenvio') && (
                                        <>
                                          <label className="block text-sm font-medium mt-3">3. Concluir:</label>
                                          <button
                                            onClick={() => handleEmbalar(order.id, order.packagingBoxId!)}
                                            disabled={processingOrder === order.id}
                                            className="w-full py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                          >
                                            <Package className="w-4 h-4" />
                                            Confirmar Embalagem
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Despachar */}
                              {order.packedAt && !order.shippedAt && (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    placeholder="Código de rastreio..."
                                    id={`tracking-${order.id}`}
                                    className="w-full p-2 border rounded-lg"
                                    defaultValue={order.trackingCode || ''}
                                  />
                                  <button
                                    onClick={() => {
                                      const input = document.getElementById(`tracking-${order.id}`) as HTMLInputElement
                                      handleDespachar(order.id, input.value)
                                    }}
                                    disabled={processingOrder === order.id}
                                    className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                    <Truck className="w-5 h-5" />
                                    Despachar Pedido
                                  </button>
                                </div>
                              )}

                              {/* Imprimir Etiqueta - Só para pedidos já embalados */}
                              {order.packedAt && (
                                <>
                                  {/* Se já tem código ou não é Correios, mostrar botão de imprimir */}
                                  {(order.trackingCode || (order.shippingMethod !== 'correios' && order.shippingCarrier !== 'correios')) && (
                                    <button
                                      onClick={() => handlePrintLabel(order.id)}
                                      className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                                        order.shippingMethod === 'correios' || order.shippingCarrier === 'correios'
                                          ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' 
                                          : order.shippingMethod === 'jadlog'
                                          ? 'bg-red-100 hover:bg-red-200 text-red-800'
                                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                      }`}
                                    >
                                      <Printer className="w-5 h-5" />
                                      {order.shippingMethod === 'correios' || order.shippingCarrier === 'correios' ? '📮 Imprimir Etiqueta' : 
                                       order.shippingMethod === 'jadlog' ? '🚚 Etiqueta Jadlog' :
                                       order.shippingMethod === 'melhorenvio' ? '📦 Etiqueta Melhor Envio' :
                                       '🖨️ Imprimir Etiqueta'}
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Status de Despachado */}
                              {order.shippedAt && (
                                <div className="p-4 bg-green-100 rounded-lg text-center">
                                  <CheckCircle className="w-8 h-8 mx-auto text-green-600" />
                                  <div className="font-semibold text-green-800 mt-2">Pedido Despachado</div>
                                  {order.trackingCode && (
                                    <div className="text-sm text-green-700 mt-1">
                                      Rastreio: <span className="font-mono">{order.trackingCode}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
