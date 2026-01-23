'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FiArrowLeft, FiPackage, FiMapPin, FiClock, FiAlertCircle, FiCreditCard, FiFileText, FiPrinter, FiDownload, FiXCircle, FiRotateCcw } from 'react-icons/fi'
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
  separatedAt?: string
  packedAt?: string
  shippedAt?: string
  trackingCode?: string
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
  invoices?: {
    id: string
    invoiceNumber?: string
    status: string
    pdfUrl?: string
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
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

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

  const handleCancelOrder = async () => {
    if (!order) return
    
    setIsCancelling(true)
    try {
      const response = await fetch(`/api/orders/${params.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        toast.success('Pedido cancelado com sucesso!')
        setShowCancelModal(false)
        fetchOrder() // Recarregar pedido
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erro ao cancelar pedido')
      }
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error)
      toast.error('Erro ao cancelar pedido')
    } finally {
      setIsCancelling(false)
    }
  }

  // Verificar se pode cancelar (antes do envio)
  const canCancel = order?.status === 'PENDING' || order?.status === 'PROCESSING'
  
  // Verificar se pode solicitar devolução (após entrega, até 7 dias)
  const canRequestReturn = (() => {
    if (!order || order.status !== 'DELIVERED' || !order.shippedAt) return false
    const shippedDate = new Date(order.shippedAt)
    const daysSinceShipped = Math.floor((Date.now() - shippedDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceShipped <= 7
  })()

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
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handlePayment}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-lg font-bold hover:from-yellow-600 hover:to-orange-600 flex items-center gap-3 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <FiCreditCard size={20} />
                  Pagar Agora
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="bg-white text-red-600 border-2 border-red-300 px-6 py-4 rounded-lg font-semibold hover:bg-red-50 flex items-center gap-2 transition-all"
                >
                  <FiXCircle size={20} />
                  Cancelar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiXCircle className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cancelar Pedido?</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja cancelar este pedido? 
                {order.paymentStatus === 'approved' && (
                  <span className="block mt-2 text-sm text-blue-600">
                    O reembolso será processado automaticamente.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <FiXCircle size={16} />
                      Sim, Cancelar
                    </>
                  )}
                </button>
              </div>
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
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                  order.status
                )}`}
              >
                {getStatusText(order.status)}
              </span>
              {/* Botão Cancelar - visível para PENDING e PROCESSING (antes do envio) */}
              {(order.status === 'PENDING' || (order.status === 'PROCESSING' && !order.shippedAt)) && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-semibold flex items-center gap-2 transition-all"
                >
                  <FiXCircle size={14} />
                  Cancelar
                </button>
              )}
              {/* Botão Devolução - visível para DELIVERED dentro do prazo */}
              {order.status === 'DELIVERED' && canRequestReturn && (
                <Link
                  href={`/pedidos/${params.id}/devolucao`}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-semibold flex items-center gap-2 transition-all"
                >
                  <FiRotateCcw size={14} />
                  Devolução
                </Link>
              )}
            </div>
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
        <div className="space-y-4">
          {/* Pedido realizado */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
              <span className="text-white">✓</span>
            </div>
            <div className="ml-4">
              <p className="font-medium">Pedido realizado</p>
              <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>

          {/* Processando - com sub-etapas se estiver PROCESSING */}
          <div className="flex items-start">
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
            <div className="ml-4 flex-1">
              <p className="font-medium">Processando</p>
              {order.paymentApprovedAt && (
                <p className="text-sm text-gray-500">Iniciado em {formatDateTime(order.paymentApprovedAt)}</p>
              )}
              
              {/* Sub-etapas quando está processando */}
              {order.status === 'PROCESSING' && (
                <div className="mt-3 ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
                  {/* Separação */}
                  <div className="flex items-center text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      order.separatedAt ? 'bg-green-400' : 'bg-gray-300'
                    }`}>
                      {order.separatedAt && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="ml-3">
                      <span className={order.separatedAt ? 'text-green-700 font-medium' : 'text-gray-600'}>
                        Separação
                      </span>
                      {order.separatedAt && (
                        <p className="text-xs text-gray-500">{formatDateTime(order.separatedAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Nota Fiscal */}
                  <div className="flex items-center text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' ? 'bg-green-400' : 'bg-gray-300'
                    }`}>
                      {order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="ml-3">
                      <span className={order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' ? 'text-green-700 font-medium' : 'text-gray-600'}>
                        Nota Fiscal
                      </span>
                      {order.invoices && order.invoices.length > 0 && order.invoices[0].status === 'ERROR' && (
                        <p className="text-xs text-red-500">Erro na emissão</p>
                      )}
                      {order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' && order.invoices[0].invoiceNumber && (
                        <p className="text-xs text-gray-500">Nº {order.invoices[0].invoiceNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Embalagem */}
                  <div className="flex items-center text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      order.packedAt ? 'bg-green-400' : 'bg-gray-300'
                    }`}>
                      {order.packedAt && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="ml-3">
                      <span className={order.packedAt ? 'text-green-700 font-medium' : 'text-gray-600'}>
                        Embalagem
                      </span>
                      {order.packedAt && (
                        <p className="text-xs text-gray-500">{formatDateTime(order.packedAt)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Despachado/Enviado */}
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
            <div className="ml-4">
              <p className="font-medium">Despachado</p>
              {order.shippedAt && (
                <p className="text-sm text-gray-500">{formatDateTime(order.shippedAt)}</p>
              )}
              {order.trackingCode && (
                <p className="text-sm text-blue-600 font-mono">Rastreio: {order.trackingCode}</p>
              )}
            </div>
          </div>

          {/* Entregue */}
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              {order.status === 'DELIVERED' && <span className="text-white">✓</span>}
            </div>
            <div className="ml-4">
              <p className="font-medium">Entregue</p>
              {order.status === 'DELIVERED' && (
                <p className="text-sm text-gray-500">Pedido finalizado</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Nota Fiscal - só aparece quando NF-e está emitida */}
      {order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center">
            <FiFileText className="mr-2 text-green-600" />
            Nota Fiscal Eletrônica
          </h3>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Número da NF-e</p>
                <p className="font-semibold text-lg text-green-700">
                  {order.invoices[0].invoiceNumber || 'Processando...'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span className="text-sm font-medium">Emitida</span>
              </div>
            </div>

            <div className="flex gap-3">
              {/* Botão para imprimir DANFE */}
              <button
                onClick={() => window.open(`/api/admin/invoices/${order.invoices![0].id}/danfe`, '_blank')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <FiPrinter className="w-4 h-4" />
                Imprimir DANFE
              </button>

              {/* Botão para baixar XML */}
              <button
                onClick={() => window.open(`/api/admin/invoices/${order.invoices![0].id}/xml`, '_blank')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <FiDownload className="w-4 h-4" />
                Baixar XML
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500 text-center">
              <p>A DANFE é o documento auxiliar da nota fiscal eletrônica para impressão.</p>
              <p>O XML contém todos os dados fiscais da operação.</p>
            </div>
          </div>
        </div>
      )}

      {/* Seção de Devolução - só aparece para pedidos entregues */}
      {order.status === 'DELIVERED' && order.shippedAt && (() => {
        const shippedDate = new Date(order.shippedAt)
        const daysSinceShipped = Math.floor((Date.now() - shippedDate.getTime()) / (1000 * 60 * 60 * 24))
        const canReturn = daysSinceShipped <= 7
        
        return (
          <div className={`mt-6 border rounded-lg p-6 ${canReturn ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <FiPackage className={`mr-2 ${canReturn ? 'text-blue-600' : 'text-gray-600'}`} />
              Devolução do Produto
            </h3>
            
            <div className={`bg-white rounded-lg p-4 border ${canReturn ? 'border-blue-200' : 'border-gray-200'}`}>
              {canReturn ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Você tem até <strong>7 dias</strong> após a entrega para solicitar a devolução.
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Ainda é possível solicitar devolução (entregue há {daysSinceShipped} dia{daysSinceShipped !== 1 ? 's' : ''})
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Link 
                      href={`/pedidos/${order.id}/devolucao`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FiArrowLeft className="w-4 h-4" />
                      Solicitar Devolução
                    </Link>
                    
                    <Link 
                      href="/politica-devolucao"
                      target="_blank"
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FiFileText className="w-4 h-4" />
                      Ver Política
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="mb-3">
                    <FiClock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">Prazo para devolução expirado</p>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    O prazo de 7 dias para solicitar devolução já foi superado.
                    (Produto entregue há {daysSinceShipped} dias)
                  </p>
                  <Link 
                    href="/politica-devolucao"
                    target="_blank"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <FiFileText className="w-4 h-4" />
                    Consultar política de devolução
                  </Link>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
