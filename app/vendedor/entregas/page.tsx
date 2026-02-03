'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Truck, CheckCircle, Clock, Search, MapPin, Phone, User, 
  Camera, FileText, AlertTriangle, Package, Navigation,
  XCircle, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'
import Image from 'next/image'
import { formatOrderNumber } from '@/lib/order'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    images: string
  }
}

interface Order {
  id: string
  status: string
  total: number
  shippingAddress: string
  buyerName: string
  buyerPhone: string
  shippedAt?: string
  deliveredAt?: string
  deliveredBy?: string
  receiverName?: string
  receiverDocument?: string
  deliveryNotes?: string
  deliveryAttempts?: number
  items: OrderItem[]
}

interface Stats {
  shipped: number
  delivered: number
  failed: number
}

type FilterStatus = 'shipped' | 'out_for_delivery' | 'delivered' | 'failed'

export default function VendedorEntregasPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats>({ shipped: 0, delivered: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('shipped')
  const [search, setSearch] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [processingOrder, setProcessingOrder] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Modal de confirmação de entrega
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [deliveryForm, setDeliveryForm] = useState({
    receiverName: '',
    receiverDocument: '',
    deliveryNotes: '',
    deliveryPhoto: ''
  })

  // Modal de tentativa falha
  const [showFailedModal, setShowFailedModal] = useState(false)
  const [failedReason, setFailedReason] = useState('')

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/vendedor/entregas?status=${filter}&search=${search}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
        setStats(data.stats || { shipped: 0, delivered: 0, failed: 0 })
      }
    } catch (error) {
      console.error('Erro ao carregar entregas:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const parseAddress = (addressJson: string) => {
    try {
      return JSON.parse(addressJson)
    } catch {
      return { street: addressJson }
    }
  }

  const openDeliveryModal = (order: Order) => {
    setSelectedOrder(order)
    setDeliveryForm({
      receiverName: order.buyerName || '',
      receiverDocument: '',
      deliveryNotes: '',
      deliveryPhoto: ''
    })
    setShowDeliveryModal(true)
  }

  const openFailedModal = (order: Order) => {
    setSelectedOrder(order)
    setFailedReason('')
    setShowFailedModal(true)
  }

  const handleConfirmDelivery = async () => {
    if (!selectedOrder || !deliveryForm.receiverName.trim()) {
      setMessage({ type: 'error', text: 'Nome de quem recebeu é obrigatório' })
      return
    }

    setProcessingOrder(selectedOrder.id)
    try {
      const res = await fetch(`/api/vendedor/entregas/${selectedOrder.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryForm)
      })

      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Entrega confirmada com sucesso!' })
        setShowDeliveryModal(false)
        loadOrders()
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao confirmar entrega' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao confirmar entrega' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleFailedDelivery = async () => {
    if (!selectedOrder) return

    setProcessingOrder(selectedOrder.id)
    try {
      const res = await fetch(`/api/vendedor/entregas/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: failedReason })
      })

      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: `⚠️ Tentativa registrada (${data.attempts}ª tentativa)` })
        setShowFailedModal(false)
        loadOrders()
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao registrar tentativa' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao registrar tentativa' })
    } finally {
      setProcessingOrder(null)
    }
  }

  const openGoogleMaps = (address: any) => {
    const query = encodeURIComponent(
      `${address.street || ''}, ${address.number || ''}, ${address.neighborhood || ''}, ${address.city || ''} - ${address.state || ''}, ${address.zipCode || ''}`
    )
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  const getProductImage = (images: string) => {
    try {
      const parsed = JSON.parse(images)
      return Array.isArray(parsed) ? parsed[0] : parsed
    } catch {
      return images || '/placeholder.png'
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filterButtons = [
    { key: 'shipped', label: 'Pendentes', icon: Truck, count: stats.shipped, color: 'yellow' },
    { key: 'failed', label: 'Com Problema', icon: AlertTriangle, count: stats.failed, color: 'red' },
    { key: 'delivered', label: 'Entregues', icon: CheckCircle, count: stats.delivered, color: 'green' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-7 h-7 text-primary-600" />
            Gerenciar Entregas
          </h1>
          <p className="text-gray-600">Confirme as entregas dos pedidos com frete próprio</p>
        </div>
        <button
          onClick={loadOrders}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key as FilterStatus)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
              filter === btn.key
                ? btn.color === 'yellow' ? 'bg-yellow-500 text-white' :
                  btn.color === 'red' ? 'bg-red-500 text-white' :
                  'bg-green-500 text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            <btn.icon className="w-5 h-5" />
            {btn.label}
            <span className={`px-2 py-0.5 rounded-full text-sm ${
              filter === btn.key ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {btn.count}
            </span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por número, nome ou endereço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando entregas...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">Nenhuma entrega encontrada</h3>
          <p className="text-gray-500">
            {filter === 'shipped' ? 'Não há pedidos pendentes de entrega' : 
             filter === 'delivered' ? 'Nenhuma entrega confirmada ainda' :
             'Nenhuma entrega com problema'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const address = parseAddress(order.shippingAddress)
            const isExpanded = expandedOrder === order.id
            
            return (
              <div key={order.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                {/* Header do Pedido */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={getProductImage(order.items[0]?.product?.images)}
                        alt=""
                        fill
                        className="object-cover"
                      />
                      {order.items.length > 1 && (
                        <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1">
                          +{order.items.length - 1}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">#{formatOrderNumber(order.id)}</span>
                        {order.deliveryAttempts && order.deliveryAttempts > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            {order.deliveryAttempts}ª tentativa
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">{order.buyerName}</p>
                      <p className="text-sm text-gray-500">
                        {address.neighborhood}, {address.city} - {address.state}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-600">
                        R$ {order.total.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.shippedAt ? `Despachado ${formatDate(order.shippedAt)}` : ''}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Detalhes Expandidos */}
                {isExpanded && (
                  <div className="border-t p-4 bg-gray-50">
                    {/* Endereço Completo */}
                    <div className="bg-white p-4 rounded-lg mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-primary-600" />
                            Endereço de Entrega
                          </h4>
                          <p className="font-medium">{address.recipientName || order.buyerName}</p>
                          <p>{address.street}, {address.number}</p>
                          {address.complement && <p>{address.complement}</p>}
                          <p>{address.neighborhood}</p>
                          <p>{address.city} - {address.state}, CEP: {address.zipCode}</p>
                          {address.reference && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Referência:</strong> {address.reference}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => openGoogleMaps(address)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Navigation className="w-4 h-4" />
                          Abrir Mapa
                        </button>
                      </div>
                    </div>

                    {/* Contato */}
                    <div className="bg-white p-4 rounded-lg mb-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-primary-600" />
                        Contato
                      </h4>
                      <div className="flex gap-4">
                        <a 
                          href={`tel:${order.buyerPhone}`}
                          className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                        >
                          <Phone className="w-4 h-4" />
                          {order.buyerPhone}
                        </a>
                        <a 
                          href={`https://wa.me/55${order.buyerPhone?.replace(/\D/g, '')}`}
                          target="_blank"
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="bg-white p-4 rounded-lg mb-4">
                      <h4 className="font-semibold mb-2">Itens ({order.items.length})</h4>
                      <div className="space-y-2">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100">
                              <Image
                                src={getProductImage(item.product.images)}
                                alt=""
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="flex-1 text-sm">{item.product.name}</span>
                            <span className="text-sm text-gray-600">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Histórico de Entregas */}
                    {order.deliveryNotes && (
                      <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold flex items-center gap-2 mb-2 text-yellow-800">
                          <AlertTriangle className="w-4 h-4" />
                          Histórico de Tentativas
                        </h4>
                        <pre className="text-sm text-yellow-700 whitespace-pre-wrap">
                          {order.deliveryNotes}
                        </pre>
                      </div>
                    )}

                    {/* Info de Entrega (se já entregue) */}
                    {order.status === 'DELIVERED' && order.deliveredAt && (
                      <div className="bg-green-50 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold flex items-center gap-2 mb-2 text-green-800">
                          <CheckCircle className="w-4 h-4" />
                          Entrega Confirmada
                        </h4>
                        <p><strong>Data:</strong> {new Date(order.deliveredAt).toLocaleString('pt-BR')}</p>
                        <p><strong>Entregue por:</strong> {order.deliveredBy}</p>
                        <p><strong>Recebido por:</strong> {order.receiverName}</p>
                        {order.receiverDocument && <p><strong>Documento:</strong> {order.receiverDocument}</p>}
                      </div>
                    )}

                    {/* Ações */}
                    {order.status !== 'DELIVERED' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => openDeliveryModal(order)}
                          disabled={processingOrder === order.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Confirmar Entrega
                        </button>
                        <button
                          onClick={() => openFailedModal(order)}
                          disabled={processingOrder === order.id}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                        >
                          <XCircle className="w-5 h-5" />
                          Não Consegui Entregar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Confirmar Entrega */}
      {showDeliveryModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Confirmar Entrega
            </h3>
            <p className="text-gray-600 mb-4">
              Pedido <strong>#{formatOrderNumber(selectedOrder.id)}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome de quem recebeu *
                </label>
                <input
                  type="text"
                  value={deliveryForm.receiverName}
                  onChange={(e) => setDeliveryForm({...deliveryForm, receiverName: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  CPF/RG de quem recebeu
                </label>
                <input
                  type="text"
                  value={deliveryForm.receiverDocument}
                  onChange={(e) => setDeliveryForm({...deliveryForm, receiverDocument: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Documento (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Observações
                </label>
                <textarea
                  value={deliveryForm.deliveryNotes}
                  onChange={(e) => setDeliveryForm({...deliveryForm, deliveryNotes: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Observações da entrega (opcional)"
                />
              </div>

              {/* TODO: Adicionar upload de foto */}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={processingOrder === selectedOrder.id}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processingOrder === selectedOrder.id ? 'Salvando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tentativa Falha */}
      {showFailedModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              Registrar Tentativa Falha
            </h3>
            <p className="text-gray-600 mb-4">
              Pedido <strong>#{formatOrderNumber(selectedOrder.id)}</strong>
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Motivo da falha
              </label>
              <select
                value={failedReason}
                onChange={(e) => setFailedReason(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 mb-2"
              >
                <option value="">Selecione o motivo</option>
                <option value="Destinatário ausente">Destinatário ausente</option>
                <option value="Endereço não localizado">Endereço não localizado</option>
                <option value="Recusado pelo destinatário">Recusado pelo destinatário</option>
                <option value="Local fechado">Local fechado</option>
                <option value="Área de risco">Área de risco</option>
                <option value="Outro">Outro motivo</option>
              </select>
              {failedReason === 'Outro' && (
                <input
                  type="text"
                  onChange={(e) => setFailedReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Descreva o motivo"
                />
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFailedModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleFailedDelivery}
                disabled={processingOrder === selectedOrder.id || !failedReason}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processingOrder === selectedOrder.id ? 'Salvando...' : 'Registrar Falha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
