'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Truck, CheckCircle, Clock, Search, 
  Printer, Box, AlertCircle, ChevronDown, ChevronUp,
  User, MapPin, Phone, Mail, RefreshCw, Filter, FileText, XCircle, Tag
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatOrderNumber } from '@/lib/order'

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
  packagingBox?: {
    id: string
    code: string
    name: string
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

export default function VendedorExpedicaoPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ExpeditionStatus>('pending')
  const [search, setSearch] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [processingOrder, setProcessingOrder] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/vendedor/expedicao?status=${filter}&search=${search}`)
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

  useEffect(() => {
    loadOrders()
    loadEmbalagens()
  }, [loadOrders])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders()
    }, 500)
    return () => clearTimeout(timer)
  }, [search, loadOrders])

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

  const handleSeparar = async (orderId: string) => {
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/vendedor/expedicao/${orderId}/separar`, { method: 'POST' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pedido marcado como separado!' })
        loadOrders()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Erro ao separar pedido' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao separar pedido' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleEmbalar = async (orderId: string, embalagemId: string) => {
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/vendedor/expedicao/${orderId}/embalar`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packagingBoxId: embalagemId })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pedido embalado!' })
        loadOrders()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Erro ao embalar pedido' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao embalar pedido' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleDespachar = async (orderId: string, trackingCode?: string) => {
    setProcessingOrder(orderId)
    try {
      const res = await fetch(`/api/vendedor/expedicao/${orderId}/despachar`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingCode })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pedido despachado!' })
        loadOrders()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Erro ao despachar pedido' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao despachar pedido' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const stats = {
    pending: orders.filter(o => !o.separatedAt).length,
    separated: orders.filter(o => o.separatedAt && !o.packedAt).length,
    packed: orders.filter(o => o.packedAt && !o.shippedAt).length,
    shipped: orders.filter(o => o.shippedAt).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Expedição</h1>
        <p className="text-gray-600">Gerencie a separação e envio dos seus pedidos</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-4 underline">Fechar</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center gap-3">
            <Clock className="text-orange-500" size={24} />
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-gray-600">Aguardando</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center gap-3">
            <Package className="text-yellow-500" size={24} />
            <div>
              <p className="text-2xl font-bold">{stats.separated}</p>
              <p className="text-sm text-gray-600">Separados</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <Box className="text-blue-500" size={24} />
            <div>
              <p className="text-2xl font-bold">{stats.packed}</p>
              <p className="text-sm text-gray-600">Embalados</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <Truck className="text-green-500" size={24} />
            <div>
              <p className="text-2xl font-bold">{stats.shipped}</p>
              <p className="text-sm text-gray-600">Enviados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por número do pedido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {(['pending', 'separated', 'packed', 'shipped', 'all'] as ExpeditionStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' && 'Todos'}
                {status === 'pending' && 'Aguardando'}
                {status === 'separated' && 'Separados'}
                {status === 'packed' && 'Embalados'}
                {status === 'shipped' && 'Enviados'}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadOrders()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Atualizar"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-lg shadow">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="mx-auto mb-4 text-gray-300" size={48} />
            <p>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map((order) => (
              <div key={order.id} className="p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-bold text-blue-600">#{formatOrderNumber(order.id)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {getStatusBadge(order)}
                    {getShippingBadge(order)}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{order.buyerName}</p>
                      <p className="text-sm text-gray-500">{order.items.length} item(s)</p>
                    </div>
                    {expandedOrder === order.id ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="mt-4 pt-4 border-t">
                    {/* Itens do pedido */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Itens:</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => {
                          const images = JSON.parse(item.product.images || '[]')
                          return (
                            <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded">
                              {images[0] && (
                                <Image
                                  src={images[0]}
                                  alt={item.product.name}
                                  width={50}
                                  height={50}
                                  className="rounded object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.product.name}</p>
                                <p className="text-xs text-gray-500">
                                  Qtd: {item.quantity}
                                  {item.selectedColor && ` | Cor: ${item.selectedColor}`}
                                  {item.selectedSize && ` | Tam: ${item.selectedSize}`}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="mb-4 bg-blue-50 p-3 rounded">
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <MapPin size={16} /> Endereço de entrega
                      </h4>
                      <p className="text-sm">{order.shippingAddress}</p>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 flex-wrap">
                      {!order.separatedAt && (
                        <button
                          onClick={() => handleSeparar(order.id)}
                          disabled={processingOrder === order.id}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Package size={18} />
                          Marcar como Separado
                        </button>
                      )}

                      {order.separatedAt && !order.packedAt && (
                        <div className="flex items-center gap-2">
                          <select
                            className="border rounded-lg px-3 py-2"
                            onChange={(e) => handleEmbalar(order.id, e.target.value)}
                            disabled={processingOrder === order.id}
                            defaultValue=""
                          >
                            <option value="" disabled>Selecionar embalagem...</option>
                            {embalagens.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.code} - {e.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {order.packedAt && !order.shippedAt && (
                        <button
                          onClick={() => {
                            const tracking = prompt('Código de rastreio (opcional):')
                            handleDespachar(order.id, tracking || undefined)
                          }}
                          disabled={processingOrder === order.id}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Truck size={18} />
                          Despachar
                        </button>
                      )}

                      {order.trackingCode && (
                        <span className="px-4 py-2 bg-gray-100 rounded-lg text-sm flex items-center gap-2">
                          <Tag size={16} />
                          Rastreio: {order.trackingCode}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
