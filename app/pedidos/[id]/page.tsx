'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FiArrowLeft, FiPackage, FiMapPin, FiClock, FiAlertCircle, FiCreditCard } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { formatOrderNumber } from '@/lib/order'
import { formatCurrency, formatDateTime } from '@/lib/format'

interface Order {
  id: string
  parentOrderId?: string | null
  total: number
  status: string
  shippingAddress: string
  createdAt: string
  shippingCost?: number
  couponCode?: string
  discountAmount?: number
  paymentType?: string
  paymentStatus?: string
  paymentId?: string
  paymentApprovedAt?: string
  items: {
    id: string
    quantity: number
    price: number
    selectedSize?: string
    selectedColor?: string
    product: {
      id: string
      name: string
      slug: string
      images: string[]
    }
  }[]
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [relatedOrders, setRelatedOrders] = useState<Order[]>([])
  const [primaryOrderId, setPrimaryOrderId] = useState<string | null>(null) // ID real para pagamento
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchOrder()
    }
  }, [status, router, params.id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`)
      if (response.ok) {
        const mainOrder = await response.json()
        setOrder(mainOrder)
        setPrimaryOrderId(mainOrder.id) // Guardar o ID real do pedido
        
        // Se tem parentOrderId, buscar todos os pedidos relacionados
        if (mainOrder.parentOrderId) {
          const allOrdersResponse = await fetch('/api/orders')
          if (allOrdersResponse.ok) {
            const allOrders = await allOrdersResponse.json()
            const related = allOrders.filter((o: Order) => 
              o.parentOrderId === mainOrder.parentOrderId || o.id === mainOrder.parentOrderId
            )
            setRelatedOrders(related)
            
            // Criar ordem agrupada para exibição (mas manter o ID do primeiro subpedido para pagamento)
            if (related.length > 1) {
              // Encontrar o primeiro subpedido (o parentOrderId)
              const firstOrder = related.find((o: Order) => o.id === mainOrder.parentOrderId) || related[0]
              setPrimaryOrderId(firstOrder.id) // Usar o ID do primeiro pedido para pagamento
              
              const groupedOrder = {
                ...mainOrder,
                id: mainOrder.parentOrderId, // ID para display
                total: related.reduce((sum: number, o: Order) => sum + o.total, 0),
                items: related.flatMap((o: Order) => o.items),
                shippingCost: related.reduce((sum: number, o: Order) => sum + (o.shippingCost || 0), 0),
                discountAmount: related.reduce((sum: number, o: Order) => sum + (o.discountAmount || 0), 0),
              }
              setOrder(groupedOrder)
            }
          }
        }
      } else {
        router.push('/pedidos')
      }
    } catch (error) {
      console.error('Erro ao buscar pedido:', error)
      router.push('/pedidos')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: 'Aguardando Pagamento',
      PROCESSING: 'Processando',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  // Função para formatar endereço (parse JSON se necessário)
  const formatShippingAddress = (address: string): string => {
    if (!address) return 'Endereço não informado'
    
    try {
      // Tentar parsear como JSON
      const parsed = JSON.parse(address)
      
      // Se tem campo 'formatted', usar ele
      if (parsed.formatted) {
        return parsed.formatted
      }
      
      // Montar endereço a partir dos campos
      const parts = []
      if (parsed.street) parts.push(parsed.street)
      if (parsed.number && parsed.number !== 'SN') parts.push(parsed.number)
      if (parsed.complement) parts.push(parsed.complement)
      if (parsed.neighborhood) parts.push(parsed.neighborhood)
      if (parsed.city) parts.push(parsed.city)
      if (parsed.state) parts.push(parsed.state)
      if (parsed.zipCode) parts.push(`CEP: ${parsed.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}`)
      
      return parts.join(', ') || address
    } catch {
      // Não é JSON, retornar como está
      return address
    }
  }

  const handlePayment = () => {
    // Usar o primaryOrderId que é o ID real do primeiro pedido
    router.push(`/checkout/pagamento/${primaryOrderId}`)
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando pedido...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/pedidos"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar para Meus Pedidos
      </Link>

      {/* Alerta de Pagamento Pendente */}
      {order.status === 'PENDING' && (
        <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-6 shadow-lg">
          <div className="flex items-start">
            <FiAlertCircle className="text-yellow-600 mt-1 mr-4 flex-shrink-0" size={28} />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-yellow-900 mb-2">
                ⏳ Aguardando Pagamento
              </h3>
              <p className="text-yellow-800 mb-4 leading-relaxed">
                Seu pedido foi criado mas ainda não foi pago. Complete o pagamento para que possamos processar seu pedido.
              </p>
              <button
                onClick={handlePayment}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-lg font-bold hover:from-yellow-600 hover:to-orange-600 flex items-center gap-3 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              >
                <FiCreditCard size={20} />
                Pagar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Pedido {formatOrderNumber(order.id)}</h1>
              <div className="flex items-center space-x-2 text-primary-100">
                <FiClock size={16} />
                <span>{formatDateTime(order.createdAt)}</span>
                {relatedOrders.length > 1 && (
                  <span className="ml-4 bg-white/20 px-3 py-1 rounded-full text-sm">
                    🔗 {relatedOrders.length} vendedores
                  </span>
                )}
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                order.status
              )}`}
            >
              {getStatusText(order.status)}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <div className="flex items-start space-x-3 mb-4">
              <FiMapPin className="text-gray-400 mt-1" size={20} />
              <div>
                <h2 className="font-semibold text-lg mb-1">Endereço de Entrega</h2>
                <p className="text-gray-600">{formatShippingAddress(order.shippingAddress)}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center">
              <FiPackage className="mr-2" />
              Itens do Pedido
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => {
                // Parsear images se for string JSON
                const images = typeof item.product.images === 'string'
                  ? JSON.parse(item.product.images)
                  : item.product.images
                const imageUrl = images?.[0] || '/placeholder.jpg'
                
                return (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                        {imageUrl !== '/placeholder.jpg' ? (
                          <Image
                            src={imageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <FiPackage className="text-gray-400" size={24} />
                        )}
                      </div>
                    <div>
                      <Link
                        href={`/produtos/${item.product.slug}`}
                        className="font-semibold hover:text-primary-600 block mb-1"
                      >
                        {item.product.name}
                      </Link>
                      {(item.selectedSize || item.selectedColor) && (
                        <div className="flex gap-3 mb-2">
                          {item.selectedSize && (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                              <span className="font-medium mr-1">Tamanho:</span> {item.selectedSize}
                            </span>
                          )}
                          {item.selectedColor && (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                              <span className="font-medium mr-1">Cor:</span> {item.selectedColor}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                      <p className="text-sm text-gray-600">
                        Preço unitário: {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Informações de Pagamento */}
          {order.status !== 'PENDING' && order.paymentType && (
            <div className="border-t pt-6 mb-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center">
                <FiCreditCard className="mr-2" />
                Informações de Pagamento
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Forma de Pagamento:</span>
                  <span className="font-medium">
                    {order.paymentType === 'credit_card' && '💳 Cartão de Crédito'}
                    {order.paymentType === 'debit_card' && '💳 Cartão de Débito'}
                    {order.paymentType === 'pix' && '🔷 Pix'}
                    {order.paymentType === 'boleto' && '🧾 Boleto Bancário'}
                    {!['credit_card', 'debit_card', 'pix', 'boleto'].includes(order.paymentType) && order.paymentType}
                  </span>
                </div>
                
                {order.paymentStatus && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status do Pagamento:</span>
                    <span className={`font-medium ${
                      order.paymentStatus === 'approved' ? 'text-green-600' :
                      order.paymentStatus === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {order.paymentStatus === 'approved' && '✓ Aprovado'}
                      {order.paymentStatus === 'pending' && '⏳ Pendente'}
                      {order.paymentStatus === 'rejected' && '✗ Recusado'}
                    </span>
                  </div>
                )}

                {order.paymentId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID da Transação:</span>
                    <span className="font-mono text-sm">{order.paymentId}</span>
                  </div>
                )}

                {order.paymentApprovedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data de Aprovação:</span>
                    <span className="font-medium">{formatDateTime(order.paymentApprovedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="border-t pt-6">
            <h2 className="font-semibold text-lg mb-4">Resumo do Pedido</h2>
            <div className="space-y-3 mb-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal dos Produtos</span>
                <span className="font-medium">{formatCurrency(
                  order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                )}</span>
              </div>
              
              {order.shippingCost !== undefined && order.shippingCost !== null && (
                <div className="flex justify-between text-gray-700">
                  <span>Frete</span>
                  <span className={`font-medium ${order.shippingCost === 0 ? 'text-green-600' : ''}`}>
                    {order.shippingCost === 0 ? 'Grátis' : formatCurrency(order.shippingCost)}
                  </span>
                </div>
              )}
              
              {order.couponCode && order.discountAmount && (
                <div className="flex justify-between text-green-600 border-t pt-2">
                  <span className="flex items-center gap-2">
                    <span className="bg-green-100 px-2 py-1 rounded text-xs font-mono">
                      {order.couponCode}
                    </span>
                    Desconto
                  </span>
                  <span className="font-bold">-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center text-2xl font-bold border-t-2 pt-4 bg-primary-50 px-4 py-3 rounded-lg">
              <span className="text-gray-800">Total</span>
              <span className="text-primary-600">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-2">Status do Pedido</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
              <span className="text-white">✓</span>
            </div>
            <p className="ml-3 font-medium">Pedido realizado</p>
          </div>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'PROCESSING' ||
                order.status === 'SHIPPED' ||
                order.status === 'DELIVERED'
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              {(order.status === 'PROCESSING' ||
                order.status === 'SHIPPED' ||
                order.status === 'DELIVERED') && <span className="text-white">✓</span>}
            </div>
            <p className="ml-3">Processando</p>
          </div>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'SHIPPED' || order.status === 'DELIVERED'
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                <span className="text-white">✓</span>
              )}
            </div>
            <p className="ml-3">Enviado</p>
          </div>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              {order.status === 'DELIVERED' && <span className="text-white">✓</span>}
            </div>
            <p className="ml-3">Entregue</p>
          </div>
        </div>
      </div>
    </div>
  )
}
