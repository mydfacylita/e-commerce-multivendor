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
  shippingCarrier?: string
  // Campos para pedidos internacionais
  isInternational?: boolean
  supplierOrderId?: string
  supplierStatus?: string
  itemTrackingCode?: string
  estimatedDeliveryDays?: number
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
      isDropshipping?: boolean
      shipFromCountry?: string
    }
  }[]
  invoices?: {
    id: string
    invoiceNumber?: string
    status: string
    pdfUrl?: string
  }[]
  paymentMethod?: string | null
  carne?: {
    id: string
    buyerName: string
    interestRate: number
    totalValue: number
    totalWithInterest: number | null
    financingAcceptedAt: string | null
    notes: string | null
    parcelas: {
      id: string
      numero: number
      valor: number
      dueDate: string
      status: string
      paidAt: string | null
    }[]
  } | null
}

// Mapa de status do AliExpress para exibição amigável
const SUPPLIER_STATUS_MAP: Record<string, { label: string; description: string; icon: string }> = {
  'PLACE_ORDER_SUCCESS': { 
    label: 'Pedido Confirmado', 
    description: 'Aguardando processamento pelo fornecedor',
    icon: '📋'
  },
  'WAIT_SELLER_SEND_GOODS': { 
    label: 'Em Preparação', 
    description: 'O fornecedor está preparando seu pedido',
    icon: '📦'
  },
  'SELLER_PART_SEND_GOODS': { 
    label: 'Parcialmente Enviado', 
    description: 'Parte do pedido já foi despachada',
    icon: '✈️'
  },
  'WAIT_BUYER_ACCEPT_GOODS': { 
    label: 'Em Trânsito Internacional', 
    description: 'Seu pedido está a caminho do Brasil',
    icon: '🌍'
  },
  'FUND_PROCESSING': { 
    label: 'Processando', 
    description: 'Processando pagamento com fornecedor',
    icon: '⏳'
  },
  'FINISH': { 
    label: 'Entregue', 
    description: 'Pedido finalizado',
    icon: '✅'
  },
  'IN_CANCEL': { 
    label: 'Cancelamento Solicitado', 
    description: 'Cancelamento em processamento',
    icon: '❌'
  },
}

// Interface para eventos de tracking
interface TrackingEvent {
  eventTime: string
  eventDescription: string
  eventLocation?: string
  status: string
}

interface TrackingInfo {
  trackingNumber: string
  carrier: string
  estimatedDelivery?: string
  currentStatus: string
  events: TrackingEvent[]
}

// ── ContractModal ──────────────────────────────────────────────────────────────
interface ContractClause { titulo: string; itens: string[] }
interface ContractData {
  clausulas: ContractClause[]
  credora: { nome: string; cnpj: string; endereco: string }
  devedor: { nome: string; cpf: string }
  totalValue: number
  totalWithInterest: number
  valorParcela: number
  numParcelas: number
  taxaJuros: number
  parcelas: { numero: number; valor: number; dueDate: string }[]
  assinatura: { local: string; data: string; credor: string; devedor: string }
}

function ContratoModal({
  orderId, onClose, onAccepted, isReadOnly = false,
}: {
  orderId: string
  onClose: () => void
  onAccepted?: () => void
  isReadOnly?: boolean
}) {
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canAccept, setCanAccept] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${orderId}/contrato`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setContract(d.contract)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [orderId])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) {
      setCanAccept(true)
    }
  }

  const handleAccept = async () => {
    if (!onAccepted) return
    setAccepting(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/aceitar-carne`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao aceitar')
      onAccepted()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAccepting(false)
    }
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FiFileText className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Contrato de Financiamento</h2>
              <p className="text-xs text-gray-500">Pedido #{orderId.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <FiArrowLeft size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" onScroll={handleScroll}>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
          )}
          {contract && (
            <>
              {/* Título */}
              <div className="text-center pb-2 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Contrato Particular de Financiamento</h3>
                <p className="text-sm text-gray-500 mt-1">{contract.credora.nome}</p>
              </div>

              {/* Partes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">CREDORA</p>
                  <p className="font-semibold text-gray-900">{contract.credora.nome}</p>
                  {contract.credora.cnpj && <p className="text-sm text-gray-600">CNPJ: {contract.credora.cnpj}</p>}
                  {contract.credora.endereco && <p className="text-sm text-gray-600">{contract.credora.endereco}</p>}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">DEVEDORA</p>
                  <p className="font-semibold text-gray-900">{contract.devedor.nome}</p>
                  {contract.devedor.cpf && <p className="text-sm text-gray-600">CPF: {contract.devedor.cpf}</p>}
                </div>
              </div>

              {/* Resumo financeiro */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Resumo Financeiro</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Valor Original</p>
                    <p className="font-bold text-gray-900">{fmt(contract.totalValue)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Taxa de Juros</p>
                    <p className="font-bold text-orange-600">{contract.taxaJuros}% a.m.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Total com Juros</p>
                    <p className="font-bold text-indigo-700">{fmt(contract.totalWithInterest)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Parcelas</p>
                    <p className="font-bold text-gray-900">{contract.numParcelas}x de {fmt(contract.valorParcela)}</p>
                  </div>
                </div>
              </div>

              {/* Cláusulas */}
              <div className="space-y-4">
                {contract.clausulas.map((c, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <p className="font-bold text-gray-900 text-sm mb-2">{c.titulo}</p>
                    <div className="space-y-1.5">
                      {c.itens.map((item, j) => (
                        <p key={j} className="text-sm text-gray-700 leading-relaxed">{item}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela de parcelas */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Plano de Pagamento</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {contract.parcelas.map(p => (
                    <div key={p.numero} className="flex justify-between items-center px-4 py-2 text-sm">
                      <span className="text-gray-600 w-20">Parcela {p.numero}/{contract.numParcelas}</span>
                      <span className="text-gray-500">{p.dueDate}</span>
                      <span className="font-semibold text-gray-900">{fmt(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assinatura */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                <p>{contract.assinatura.local && `${contract.assinatura.local}, `}{contract.assinatura.data}</p>
                <div className="grid grid-cols-2 gap-8 mt-6">
                  <div className="text-center">
                    <div className="border-t border-gray-400 pt-2"></div>
                    <p className="font-medium">{contract.assinatura.credor}</p>
                    <p className="text-xs text-gray-500">CREDORA</p>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-gray-400 pt-2"></div>
                    <p className="font-medium">{contract.assinatura.devedor}</p>
                    <p className="text-xs text-gray-500">DEVEDORA</p>
                  </div>
                </div>
              </div>

              {!isReadOnly && !canAccept && (
                <div className="text-center text-sm text-indigo-600 font-medium animate-pulse py-2">
                  📜 Role até o final para habilitar a assinatura
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
            Fechar
          </button>
          {!isReadOnly && (
            <button
              onClick={handleAccept}
              disabled={!canAccept || accepting}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
            >
              {accepting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Assinando…</>
              ) : (
                <>✅ Assinar e Aceitar Financiamento</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Modal de pagamento de parcela via Pix ou Boleto
function PagamentoParcelaModal({
  data,
  orderId,
  onClose,
  onPaid
}: {
  data: {
    parcelaId: string
    method: 'pix' | 'boleto'
    qrCode?: string
    qrCodeBase64?: string
    boletoUrl?: string
    paymentUrl?: string
    valor: number
    numero: number
  }
  orderId: string
  onClose: () => void
  onPaid: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [paid, setPaid] = useState(false)

  // Polling a cada 5s para Pix (mesmo padrão do checkout)
  useEffect(() => {
    if (data.method !== 'pix' || paid) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/orders/${orderId}/carne/parcelas/${data.parcelaId}/check-status`
        )
        if (!res.ok) return
        const result = await res.json()
        if (result.paid) {
          clearInterval(interval)
          setPaid(true)
          setTimeout(() => {
            onPaid()
            onClose()
          }, 2500)
        }
      } catch {
        // ignorar erros de rede no polling
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [data.method, data.parcelaId, orderId, paid, onPaid, onClose])

  const handleCopy = () => {
    if (data.qrCode) {
      navigator.clipboard.writeText(data.qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {paid ? '✅ Pagamento Confirmado!' : data.method === 'pix' ? '📱 Pagar com Pix' : '📄 Pagar com Boleto'}
            </h2>
            <p className="text-sm text-gray-500">
              Parcela {data.numero} · R$ {data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {!paid && <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>}
        </div>

        {/* Tela de sucesso após confirmação do Pix */}
        {paid && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-5xl animate-bounce">
              ✅
            </div>
            <p className="text-lg font-bold text-green-800">Parcela {data.numero} paga!</p>
            <p className="text-sm text-gray-500">Seu pagamento foi confirmado. Atualizando...</p>
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <div className="p-6" style={{ display: paid ? 'none' : undefined }}>
          {data.method === 'pix' ? (
            <div className="flex flex-col items-center gap-4">
              {data.qrCodeBase64 && (
                <img
                  src={`data:image/png;base64,${data.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-48 h-48 border border-gray-200 rounded-xl"
                />
              )}
              <p className="text-sm text-gray-600 text-center">
                Escaneie o QR Code acima ou copie o código Pix abaixo
              </p>
              {data.qrCode && (
                <div className="w-full">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 font-mono break-all max-h-20 overflow-y-auto">
                    {data.qrCode}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="mt-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
                  >
                    {copied ? '✅ Copiado!' : '📋 Copiar código Pix'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl">
                📄
              </div>
              <p className="text-sm text-gray-600 text-center">
                O boleto foi gerado com sucesso. Clique abaixo para visualizar e pagar.
              </p>
              <a
                href={data.boletoUrl || data.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-900 transition-colors text-sm text-center"
              >
                🔗 Abrir Boleto
              </a>
              <p className="text-xs text-gray-400 text-center">
                O boleto pode levar até 3 dias úteis para ser compensado.
              </p>
            </div>
          )}
        </div>

        {!paid && (
          <div className="p-4 border-t border-gray-100">
            <button onClick={onClose} className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
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
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [isLoadingTracking, setIsLoadingTracking] = useState(false)
  const [isAcceptingFinancing, setIsAcceptingFinancing] = useState(false)
  const [financingError, setFinancingError] = useState<string | null>(null)
  const [showContrato, setShowContrato] = useState(false)
  const [viewContratoReadOnly, setViewContratoReadOnly] = useState(false)
  const [payingParcela, setPayingParcela] = useState<string | null>(null)
  const [pagamentoModal, setPagamentoModal] = useState<{
    parcelaId: string
    method: 'pix' | 'boleto'
    qrCode?: string
    qrCodeBase64?: string
    boletoUrl?: string
    paymentUrl?: string
    valor: number
    numero: number
  } | null>(null)

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

  // Buscar eventos de rastreamento
  const fetchTrackingInfo = async (supplierOrderId: string) => {
    if (!supplierOrderId) return
    
    setIsLoadingTracking(true)
    try {
      const response = await fetch('/api/orders/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: supplierOrderId })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.hasTracking && data.tracking) {
          setTrackingInfo(data.tracking)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar rastreamento:', error)
    } finally {
      setIsLoadingTracking(false)
    }
  }

  // Buscar tracking quando tiver supplierOrderId
  useEffect(() => {
    if (order?.supplierOrderId) {
      fetchTrackingInfo(order.supplierOrderId)
    }
  }, [order?.supplierOrderId])

  const getStatusText = (status: string) => {
    // Casos especiais de financiamento
    if (order?.paymentMethod === 'carne') {
      if (status === 'PENDING') return 'Aguardando Aceite'
      if (status === 'PROCESSING' && order?.paymentStatus === 'financing') return 'Em Financiamento'
    }
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
    // Cor especial para financiamento
    if (order?.paymentMethod === 'carne' && status === 'PROCESSING' && order?.paymentStatus === 'financing') {
      return 'bg-indigo-100 text-indigo-800'
    }
    if (order?.paymentMethod === 'carne' && status === 'PENDING') {
      return 'bg-blue-100 text-blue-800'
    }
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

  const handleAcceptFinancing = async () => {
    if (!order) return
    setIsAcceptingFinancing(true)
    setFinancingError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/aceitar-carne`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao aceitar')
      toast.success('Financiamento aceito! Seu pedido está em processamento.')
      fetchOrder()
    } catch (e: any) {
      setFinancingError(e.message)
      toast.error(e.message)
    } finally {
      setIsAcceptingFinancing(false)
    }
  }

  const handleRejectFinancing = async () => {
    if (!order) return
    if (!confirm('Tem certeza que deseja recusar o financiamento? O pedido voltará ao estado original.')) return
    setIsAcceptingFinancing(true)
    try {
      const res = await fetch(`/api/orders/${params.id}/aceitar-carne`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao recusar')
      toast.success('Financiamento recusado.')
      fetchOrder()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsAcceptingFinancing(false)
    }
  }

  const handlePagarParcela = async (parcelaId: string, method: 'pix' | 'boleto') => {
    setPayingParcela(parcelaId)
    try {
      const res = await fetch(`/api/orders/${params.id}/carne/parcelas/${parcelaId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao gerar pagamento')
        return
      }
      setPagamentoModal({ ...data, parcelaId })
    } catch (e: any) {
      toast.error('Erro ao gerar pagamento')
    } finally {
      setPayingParcela(null)
    }
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

      {/* Banner: Aceite do Financiamento (Carnê) */}
      {order.status === 'PENDING' && order.paymentMethod === 'carne' && order.carne && !order.carne.financingAcceptedAt && (
        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-400 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">📋</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-indigo-900 mb-1">Proposta de Financiamento</h3>
              <p className="text-indigo-700 text-sm mb-4">
                A loja criou uma proposta de carnê para o seu pedido. Leia os termos abaixo e aceite para confirmar.
              </p>

              {/* Resumo financeiro */}
              <div className="bg-white/70 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Valor original do pedido</span>
                  <span className="font-medium">R$ {order.carne.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {order.carne.interestRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxa de juros compostos</span>
                    <span className="font-medium text-orange-600">{order.carne.interestRate}% ao mês</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-indigo-900 border-t border-indigo-100 pt-2">
                  <span>Total a pagar ({order.carne.parcelas.length}x)</span>
                  <span className="text-lg">R$ {(order.carne.totalWithInterest ?? order.carne.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Parcelas */}
              <div className="bg-white/70 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parcelas</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {order.carne.parcelas.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Parcela {p.numero}/{order.carne!.parcelas.length}</span>
                      <span className="text-gray-500">{new Date(p.dueDate).toLocaleDateString('pt-BR')}</span>
                      <span className="font-bold text-indigo-700">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {order.carne.notes && (
                <p className="text-xs text-indigo-600 italic mb-3">Obs: {order.carne.notes}</p>
              )}

              {financingError && (
                <p className="text-sm text-red-600 mb-3">{financingError}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setViewContratoReadOnly(false); setShowContrato(true) }}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md transition-all"
                >
                  <FiFileText size={18} /> 📄 Ler e Assinar Contrato
                </button>
                <button
                  onClick={handleRejectFinancing}
                  disabled={isAcceptingFinancing}
                  className="bg-white text-red-600 border-2 border-red-300 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  ❌ Recusar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner: Em Financiamento (já aceito) */}
      {order.paymentMethod === 'carne' && order.carne?.financingAcceptedAt && order.paymentStatus === 'financing' && (
        <div className="mb-6 space-y-4">
          {/* Banner aceito */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div className="flex-1">
                <p className="font-bold text-green-900">Financiamento Aceito</p>
                <p className="text-sm text-green-700">
                  Você aceitou o carnê em {new Date(order.carne.financingAcceptedAt).toLocaleDateString('pt-BR')}. 
                  Pague as parcelas conforme as datas combinadas.
                </p>
              </div>
              <button
                onClick={() => { setViewContratoReadOnly(true); setShowContrato(true) }}
                className="flex items-center gap-2 text-sm bg-white border border-green-300 text-green-700 px-4 py-2 rounded-xl hover:bg-green-50 font-medium transition-colors flex-shrink-0"
              >
                <FiFileText size={15} /> Ver Contrato
              </button>
            </div>
          </div>

          {/* Tabela de parcelas */}
          <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-indigo-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">💳 Minhas Parcelas</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {order.carne.parcelas.filter(p => p.status === 'PAID').length}/{order.carne.parcelas.length} pagas
                  {' · '}Total: R$ {(order.carne.totalWithInterest ?? order.carne.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {/* Progresso */}
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">
                  {Math.round((order.carne.parcelas.filter(p => p.status === 'PAID').length / order.carne.parcelas.length) * 100)}% quitado
                </p>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(order.carne.parcelas.filter(p => p.status === 'PAID').length / order.carne.parcelas.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {order.carne.parcelas.map(p => {
                const statusMap: Record<string, { label: string; cls: string; icon: string }> = {
                  PENDING:   { label: 'A vencer',  cls: 'bg-amber-100 text-amber-700',  icon: '⏳' },
                  PAID:      { label: 'Pago',       cls: 'bg-green-100 text-green-700',  icon: '✅' },
                  OVERDUE:   { label: 'Vencida',    cls: 'bg-red-100 text-red-700',      icon: '⚠️' },
                  CANCELLED: { label: 'Cancelada',  cls: 'bg-gray-100 text-gray-500',    icon: '—'  },
                }
                const st = statusMap[p.status] || statusMap.PENDING
                const isOverdue = p.status === 'OVERDUE'
                return (
                  <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {p.numero}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                          {st.icon} {st.label}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        Vencimento: {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                        {p.paidAt && <span className="ml-2 text-green-600">· Pago em {new Date(p.paidAt).toLocaleDateString('pt-BR')}</span>}
                      </p>
                    </div>
                    {(p.status === 'PENDING' || p.status === 'OVERDUE') && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handlePagarParcela(p.id, 'pix')}
                          disabled={payingParcela === p.id}
                          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 font-medium transition-colors"
                        >
                          {payingParcela === p.id ? '...' : '📱 Pix'}
                        </button>
                        <button
                          onClick={() => handlePagarParcela(p.id, 'boleto')}
                          disabled={payingParcela === p.id}
                          className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1 font-medium transition-colors"
                        >
                          {payingParcela === p.id ? '...' : '📄 Boleto'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Para dúvidas sobre pagamento, entre em contato com a loja.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contrato */}
      {showContrato && order?.carne && (
        <ContratoModal
          orderId={params.id}
          isReadOnly={viewContratoReadOnly}
          onClose={() => setShowContrato(false)}
          onAccepted={() => {
            toast.success('Financiamento aceito! Seu pedido está em processamento.')
            setShowContrato(false)
            fetchOrder()
          }}
        />
      )}

      {/* Modal de pagamento de parcela */}
      {pagamentoModal && (
        <PagamentoParcelaModal
          data={pagamentoModal}
          orderId={params.id}
          onClose={() => setPagamentoModal(null)}
          onPaid={() => {
            setPagamentoModal(null)
            fetchOrder()
          }}
        />
      )}

      {/* Alerta de Pagamento Pendente (apenas pedidos normais, sem carnê) */}
      {order.status === 'PENDING' && order.paymentMethod !== 'carne' && (
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
              {/* Botão Cancelar - oculto para carnê com contrato aceito */}
              {(order.status === 'PENDING' || (order.status === 'PROCESSING' && !order.shippedAt)) && !(order.paymentMethod === 'carne' && order.carne?.financingAcceptedAt) && (
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

          {/* Status do Pedido - Timeline */}
          <div className="border-t pt-6 mb-6">
            <h2 className="font-semibold text-lg mb-4">Status do Pedido</h2>
            
            {/* PEDIDO INTERNACIONAL - Status específico */}
            {order.isInternational ? (
              <div className="space-y-4">
                {/* Pedido realizado */}
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
                    <span className="text-white">✓</span>
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Pedido Realizado</p>
                    <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
                  </div>
                </div>

                {/* Pagamento confirmado */}
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.paymentApprovedAt ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {order.paymentApprovedAt && <span className="text-white">✓</span>}
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Pagamento Confirmado</p>
                    {order.paymentApprovedAt && (
                      <p className="text-sm text-gray-500">{formatDateTime(order.paymentApprovedAt)}</p>
                    )}
                  </div>
                </div>

                {/* Processando */}
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.supplierOrderId ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {order.supplierOrderId && <span className="text-white">✓</span>}
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Processando</p>
                  </div>
                </div>

                {/* Despachado */}
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.status === 'SHIPPED' || order.status === 'DELIVERED'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}>
                    {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                      <span className="text-white">✓</span>
                    )}
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Despachado</p>
                    {order.shippedAt && (
                      <p className="text-sm text-gray-500">{formatDateTime(order.shippedAt)}</p>
                    )}
                    {(order.trackingCode || order.itemTrackingCode) && (
                      <p className="text-sm text-blue-600 font-mono">Rastreio: {order.trackingCode || order.itemTrackingCode}</p>
                    )}
                  </div>
                </div>

                {/* Entregue */}
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {order.status === 'DELIVERED' && <span className="text-white">✓</span>}
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Entregue</p>
                    {order.status === 'DELIVERED' && (
                      <p className="text-sm text-gray-500">Pedido finalizado</p>
                    )}
                  </div>
                </div>

                {/* Eventos de Rastreamento */}
                {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <FiMapPin className="text-blue-500" />
                      Rastreamento Detalhado
                    </h4>
                    
                    {isLoadingTracking ? (
                      <div className="flex items-center gap-2 text-gray-500 py-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span>Carregando eventos...</span>
                      </div>
                    ) : trackingInfo ? (
                      <div className="space-y-3">
                        {/* Info do rastreamento */}
                        <div className="bg-blue-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Transportadora:</span>
                            <span className="font-medium text-gray-800">{trackingInfo.carrier}</span>
                          </div>
                          {trackingInfo.estimatedDelivery && (
                            <div className="flex items-center justify-between text-sm mt-1">
                              <span className="text-gray-600">Previsão de entrega:</span>
                              <span className="font-medium text-green-600">{trackingInfo.estimatedDelivery}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Lista de eventos */}
                        {trackingInfo.events.length > 0 ? (
                          <div className="space-y-3">
                            {trackingInfo.events.map((event, index) => (
                              <div key={index} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full ${
                                    index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                                  }`}></div>
                                  {index < trackingInfo.events.length - 1 && (
                                    <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                                  )}
                                </div>
                                <div className="flex-1 pb-3">
                                  <p className={`text-sm ${index === 0 ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                                    {event.eventDescription}
                                  </p>
                                  {event.eventLocation && (
                                    <p className="text-xs text-gray-500 mt-0.5">{event.eventLocation}</p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(event.eventTime).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 py-2">
                            Aguardando atualizações de rastreamento...
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 py-2">
                        Informações de rastreamento ainda não disponíveis.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* PEDIDO NACIONAL - Status padrão */
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

                {/* Processando */}
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
            )}
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

      {/* Seção de Nota Fiscal - só aparece quando NF-e está emitida e não é pedido internacional */}
      {!order.isInternational && order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' && (
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
