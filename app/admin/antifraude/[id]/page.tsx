'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiMapPin,
  FiUser,
  FiMail,
  FiPhone,
  FiCreditCard,
  FiCalendar,
  FiPackage,
  FiGlobe,
  FiShield
} from 'react-icons/fi'
import { formatCurrency, formatDateTime } from '@/lib/format'
import toast from 'react-hot-toast'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


interface OrderDetails {
  order: any
  paymentInfo: any
  ordersFromSameIP: any[]
  ordersToSameAddress: any[]
  accountAgeDays: number
}

export default function FraudDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [details, setDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchDetails()
  }, [params.id])

  const fetchDetails = async () => {
    try {
      const response = await fetch(`/api/admin/fraud/${params.id}/details`)
      if (response.ok) {
        const data = await response.json()
        setDetails(data)
        setNotes(data.order.fraudNotes || '')
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error)
      toast.error('Erro ao carregar detalhes')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (action: 'approve' | 'reject' | 'investigating') => {
    if (!details) return

    const confirmMessages = {
      approve: 'Aprovar este pedido e liberar para processamento?',
      reject: 'Rejeitar e cancelar este pedido? Esta ação não pode ser desfeita.',
      investigating: 'Marcar como "em investigação"?'
    }

    if (!confirm(confirmMessages[action])) return

    try {
      setReviewing(true)
      const response = await fetch(`/api/admin/fraud/${params.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes })
      })

      if (response.ok) {
        toast.success(
          action === 'approve'
            ? 'Pedido aprovado!'
            : action === 'reject'
            ? 'Pedido rejeitado'
            : 'Marcado como em investigação'
        )
        router.push('/admin/antifraude')
      } else {
        toast.error('Erro ao processar ação')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao processar')
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Pedido não encontrado</p>
        </div>
      </div>
    )
  }

  const { order, paymentInfo, ordersFromSameIP, ordersToSameAddress, accountAgeDays } = details
  const reasons = order.fraudReasons ? JSON.parse(order.fraudReasons) : []

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800 border-red-300'
    if (score >= 50) return 'bg-orange-100 text-orange-800 border-orange-300'
    if (score >= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-green-100 text-green-800 border-green-300'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'CRÍTICO'
    if (score >= 50) return 'ALTO'
    if (score >= 30) return 'MÉDIO'
    return 'BAIXO'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/antifraude"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4"
        >
          <FiArrowLeft />
          Voltar para lista
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiShield className="text-primary-600" />
              Análise de Fraude - Pedido #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-gray-600 mt-1">
              Criado em {formatDateTime(order.createdAt)}
            </p>
          </div>

          <div
            className={`px-6 py-3 rounded-lg border-2 font-bold text-lg ${getRiskColor(
              order.fraudScore
            )}`}
          >
            {getRiskLabel(order.fraudScore)} - {order.fraudScore}/100
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Aviso de Pagamento Pendente */}
          {order.paymentStatus !== 'approved' && order.fraudStatus !== 'rejected' && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-yellow-800 mb-1">
                    ⚠️ ATENÇÃO: Pagamento Não Confirmado
                  </h3>
                  <p className="text-yellow-700 text-sm">
                    Este pedido ainda <strong>NÃO teve o pagamento aprovado</strong>. Mesmo que
                    você aprove a análise de fraude, o pedido só será liberado para processamento
                    após a confirmação do pagamento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Motivos da Suspeita */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiAlertTriangle className="text-orange-500" />
              Motivos da Suspeita
            </h2>
            <ul className="space-y-2">
              {reasons.map((reason: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiUser className="text-primary-600" />
              Dados do Comprador
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Nome</label>
                <p className="font-medium text-gray-900">{order.buyerName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">CPF</label>
                <p className="font-medium text-gray-900">{order.buyerCpf || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <p className="font-medium text-gray-900">{order.buyerEmail}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Telefone</label>
                <p className="font-medium text-gray-900">{order.buyerPhone || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Idade da Conta</label>
                <p className="font-medium text-gray-900">
                  {accountAgeDays === 0
                    ? 'Criada hoje'
                    : accountAgeDays === 1
                    ? '1 dia'
                    : `${accountAgeDays} dias`}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Pedidos Anteriores</label>
                <p className="font-medium text-gray-900">{order.user.orders.length}</p>
              </div>
            </div>
          </div>

          {/* Dados do Pagamento */}
          {paymentInfo && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiCreditCard className="text-primary-600" />
                Informações de Pagamento
              </h2>
              <div className="space-y-3">                {/* Status do Pagamento */}
                <div
                  className={`p-4 rounded-lg border-2 ${
                    order.paymentStatus === 'approved'
                      ? 'bg-green-50 border-green-300'
                      : order.paymentStatus === 'pending'
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-red-50 border-red-300'
                  }`}
                >
                  <label className="text-sm font-medium text-gray-700">Status do Pagamento</label>
                  <p
                    className={`text-lg font-bold ${
                      order.paymentStatus === 'approved'
                        ? 'text-green-700'
                        : order.paymentStatus === 'pending'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}
                  >
                    {order.paymentStatus === 'approved' && '✅ PAGAMENTO APROVADO'}
                    {order.paymentStatus === 'pending' && '⏳ AGUARDANDO PAGAMENTO'}
                    {order.paymentStatus === 'failed' && '❌ PAGAMENTO RECUSADO'}
                    {!order.paymentStatus && '⏳ AGUARDANDO PAGAMENTO'}
                  </p>
                  {order.paymentApprovedAt && (
                    <p className="text-sm text-gray-600 mt-1">
                      Aprovado em: {formatDateTime(order.paymentApprovedAt)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Método</label>
                  <p className="font-medium text-gray-900">{paymentInfo.payment_method_id}</p>
                </div>
                {paymentInfo.payer && (
                  <>
                    <div>
                      <label className="text-sm text-gray-600">Nome no Pagamento</label>
                      <p className="font-medium text-gray-900">
                        {paymentInfo.payer.first_name} {paymentInfo.payer.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">CPF no Pagamento</label>
                      <p className="font-medium text-gray-900">
                        {paymentInfo.payer.identification?.number || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email no Pagamento</label>
                      <p className="font-medium text-gray-900">{paymentInfo.payer.email}</p>
                    </div>
                  </>
                )}
                {order.buyerCpf && paymentInfo.payer?.identification?.number && (
                  <div
                    className={`p-3 rounded-lg ${
                      order.buyerCpf.replace(/\D/g, '') ===
                      paymentInfo.payer.identification.number.replace(/\D/g, '')
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        order.buyerCpf.replace(/\D/g, '') ===
                        paymentInfo.payer.identification.number.replace(/\D/g, '')
                          ? 'text-green-800'
                          : 'text-red-800'
                      }`}
                    >
                      {order.buyerCpf.replace(/\D/g, '') ===
                      paymentInfo.payer.identification.number.replace(/\D/g, '')
                        ? '✅ CPF do pedido corresponde ao CPF do pagamento'
                        : '🚨 CPF do pedido DIFERENTE do CPF do pagamento'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Endereço de Entrega */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiMapPin className="text-primary-600" />
              Endereço de Entrega
            </h2>
            {(() => {
              try {
                const address = JSON.parse(order.shippingAddress)
                return (
                  <div className="space-y-2 text-gray-700">
                    <p><strong>Rua:</strong> {address.street}, {address.number}</p>
                    {address.complement && <p><strong>Complemento:</strong> {address.complement}</p>}
                    {address.neighborhood && <p><strong>Bairro:</strong> {address.neighborhood}</p>}
                    <p><strong>Cidade:</strong> {address.city} - {address.state}</p>
                    <p><strong>CEP:</strong> {address.zipCode}</p>
                  </div>
                )
              } catch {
                return <p className="text-gray-700 whitespace-pre-line">{order.shippingAddress}</p>
              }
            })()}
          </div>

          {/* Pedidos no Mesmo Endereço */}
          {ordersToSameAddress.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiMapPin className="text-orange-500" />
                Outros Pedidos no Mesmo Endereço ({ordersToSameAddress.length})
              </h2>
              <div className="space-y-2">
                {ordersToSameAddress.map((o: any) => (
                  <div key={o.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {o.buyerName} - CPF: {o.buyerCpf}
                        </p>
                        <p className="text-sm text-gray-600">{o.buyerEmail}</p>
                      </div>
                      <p className="font-semibold text-primary-600">{formatCurrency(o.total)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(o.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pedidos do Mesmo IP */}
          {ordersFromSameIP.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiGlobe className="text-orange-500" />
                Outros Pedidos do Mesmo IP ({ordersFromSameIP.length})
              </h2>
              <div className="space-y-2">
                {ordersFromSameIP.map((o: any) => (
                  <div key={o.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {o.buyerName} - CPF: {o.buyerCpf}
                        </p>
                      </div>
                      <p className="font-semibold text-primary-600">{formatCurrency(o.total)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(o.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Ações */}
        <div className="space-y-6">
          {/* Status da Análise (se já foi analisado) */}
          {order.fraudStatus && order.fraudStatus !== 'pending' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiCheckCircle className={`${
                  order.fraudStatus === 'approved' ? 'text-green-600' :
                  order.fraudStatus === 'rejected' ? 'text-red-600' :
                  'text-blue-600'
                }`} />
                Análise Concluída
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <p className={`font-semibold text-lg ${
                    order.fraudStatus === 'approved' ? 'text-green-600' :
                    order.fraudStatus === 'rejected' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {order.fraudStatus === 'approved' ? '✅ Aprovado' :
                     order.fraudStatus === 'rejected' ? '❌ Rejeitado' :
                     '🔍 Em Investigação'}
                  </p>
                </div>

                {order.fraudCheckedAt && (
                  <div>
                    <label className="text-sm text-gray-600">Analisado em</label>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(order.fraudCheckedAt)}
                    </p>
                  </div>
                )}

                {order.fraudNotes && (
                  <div>
                    <label className="text-sm text-gray-600">Observações</label>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-line">
                      {order.fraudNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card de Ações - só mostra se ainda está pendente */}
          {(!order.fraudStatus || order.fraudStatus === 'pending' || order.fraudStatus === 'investigating') && (
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações</h3>

              <div className="space-y-3">
                <button
                  onClick={() => handleReview('approve')}
                  disabled={reviewing}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FiCheckCircle />
                  Aprovar Pedido
                </button>

                <button
                  onClick={() => handleReview('investigating')}
                  disabled={reviewing}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FiSearch />
                  Investigar Mais
                </button>

                <button
                  onClick={() => handleReview('reject')}
                  disabled={reviewing}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FiXCircle />
                  Rejeitar/Cancelar
                </button>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações da Análise
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Adicione observações sobre sua análise..."
                />
              </div>
            </div>
          )}

          {/* Info Adicional */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Técnicas</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-gray-600">IP Address</label>
                <p className="font-mono text-gray-900">{order.ipAddress || 'N/A'}</p>
              </div>
              <div>
                <label className="text-gray-600">User Agent</label>
                <p className="text-xs text-gray-700 break-words">{order.userAgent || 'N/A'}</p>
              </div>
              <div>
                <label className="text-gray-600">Método de Pagamento</label>
                <p className="font-medium text-gray-900">{order.paymentMethod || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
