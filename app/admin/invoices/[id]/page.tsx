'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { FiArrowLeft, 
  FiFileText, 
  FiDownload, 
  FiX, 
  FiEdit3,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiXCircle,
  FiExternalLink,
  FiCopy,
  FiRefreshCw,
  FiInfo,
  FiPackage,
  FiUser,
  FiMapPin,
  FiCalendar,
  FiHash,
  FiSend
} from 'react-icons/fi'
interface InvoiceDetail {
  id: string
  invoiceNumber: string | null
  accessKey: string | null
  series: string | null
  type: string
  status: string
  cfop: string | null
  naturezaOperacao: string | null
  valorTotal: number
  valorProdutos: number
  valorFrete: number | null
  valorDesconto: number | null
  valorIcms: number | null
  valorPis: number | null
  valorCofins: number | null
  issuedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  errorMessage: string | null
  protocol: string | null
  xmlUrl: string | null
  pdfUrl: string | null
  danfeUrl: string | null
  createdAt: string
  updatedAt: string
  emitenteCnpj: string | null
  emitenteNome: string | null
  emitenteIE: string | null
  emitenteCRT: string | null
  emitenteLogradouro: string | null
  emitenteNumero: string | null
  emitenteComplemento: string | null
  emitenteBairro: string | null
  emitenteMunicipio: string | null
  emitenteUF: string | null
  emitenteCEP: string | null
  destinatarioCpf: string | null
  destinatarioCnpj: string | null
  destinatarioNome: string | null
  destinatarioLogradouro: string | null
  destinatarioNumero: string | null
  destinatarioComplemento: string | null
  destinatarioBairro: string | null
  destinatarioMunicipio: string | null
  destinatarioUF: string | null
  destinatarioCEP: string | null
  order: {
    id: string
    buyerName: string
    buyerEmail: string | null
    buyerPhone: string | null
    status: string
    total: number
    items: Array<{
      id: string
      productName: string
      quantity: number
      price: number
    }>
  }
  events: Array<{
    id: string
    type: string
    description: string
    protocol: string | null
    xmlUrl: string | null
    createdAt: string
    createdBy: string | null
  }>
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string
  
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showCCeModal, setShowCCeModal] = useState(false)
  
  // Form states
  const [cancelReason, setCancelReason] = useState('')
  const [cceText, setCceText] = useState('')

  useEffect(() => {
    loadInvoice()
  }, [invoiceId])

  const loadInvoice = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/invoices/${invoiceId}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao carregar nota fiscal')
      }
      const data = await res.json()
      setInvoice(data)
    } catch (error: any) {
      toast.error(error.message)
      router.push('/admin/invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 15) {
      toast.error('Justificativa deve ter no mínimo 15 caracteres')
      return
    }
    if (cancelReason.trim().length > 255) {
      toast.error('Justificativa deve ter no máximo 255 caracteres')
      return
    }

    try {
      setActionLoading('cancel')
      const res = await fetch(`/api/admin/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justificativa: cancelReason.trim() })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar nota fiscal')

      toast.success('Nota fiscal cancelada com sucesso!')
      setShowCancelModal(false)
      setCancelReason('')
      loadInvoice()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCCe = async () => {
    if (!cceText.trim() || cceText.trim().length < 15) {
      toast.error('Correção deve ter no mínimo 15 caracteres')
      return
    }
    if (cceText.trim().length > 1000) {
      toast.error('Correção deve ter no máximo 1000 caracteres')
      return
    }

    try {
      setActionLoading('cce')
      const res = await fetch(`/api/admin/invoices/${invoiceId}/cce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correcao: cceText.trim() })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar Carta de Correção')

      toast.success('Carta de Correção enviada com sucesso!')
      setShowCCeModal(false)
      setCceText('')
      loadInvoice()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleConsultaSefaz = async () => {
    try {
      setActionLoading('consulta')
      const res = await fetch(`/api/admin/invoices/${invoiceId}/consultar`, {
        method: 'POST'
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao consultar SEFAZ')

      toast.success('Consulta realizada com sucesso!')
      loadInvoice()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReenviar = async () => {
    try {
      setActionLoading('reenviar')
      const res = await fetch(`/api/admin/invoices/${invoiceId}/reenviar`, {
        method: 'POST'
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao reenviar nota fiscal')

      toast.success('Nota fiscal reenviada com sucesso!')
      loadInvoice()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado para área de transferência`)
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: JSX.Element; color: string; bgColor: string; label: string }> = {
      PENDING: {
        icon: <FiClock />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: 'Pendente'
      },
      PROCESSING: {
        icon: <FiRefreshCw className="animate-spin" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'Processando'
      },
      ISSUED: {
        icon: <FiCheckCircle />,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Autorizada'
      },
      CANCELLED: {
        icon: <FiXCircle />,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: 'Cancelada'
      },
      ERROR: {
        icon: <FiAlertCircle />,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Erro/Rejeitada'
      }
    }
    return configs[status] || configs.PENDING
  }

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      EMISSAO: { label: 'Emissão', color: 'bg-green-100 text-green-800' },
      AUTORIZACAO: { label: 'Autorização', color: 'bg-green-100 text-green-800' },
      CANCELAMENTO: { label: 'Cancelamento', color: 'bg-red-100 text-red-800' },
      CCE: { label: 'Carta de Correção', color: 'bg-yellow-100 text-yellow-800' },
      INUTILIZACAO: { label: 'Inutilização', color: 'bg-gray-100 text-gray-800' },
      CONSULTA: { label: 'Consulta', color: 'bg-blue-100 text-blue-800' },
      ERRO: { label: 'Erro', color: 'bg-red-100 text-red-800' }
    }
    return labels[type] || { label: type, color: 'bg-gray-100 text-gray-800' }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('pt-BR')
  }

  const formatCPFCNPJ = (doc: string | null) => {
    if (!doc) return '-'
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return doc
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Nota fiscal não encontrada</p>
      </div>
    )
  }

  const statusConfig = getStatusConfig(invoice.status)
  const canCancel = invoice.status === 'ISSUED' && invoice.accessKey
  const canCCe = invoice.status === 'ISSUED' && invoice.accessKey
  const canRetry = invoice.status === 'ERROR'

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/admin/invoices')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiArrowLeft className="text-xl" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FiFileText className="text-blue-600" />
            Nota Fiscal {invoice.invoiceNumber || 'Pendente'}
          </h1>
          <p className="text-gray-600">
            Série {invoice.series || '1'} • {invoice.type === 'ADMIN' ? 'Administrativa' : 'Vendedor'}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.color}`}>
          {statusConfig.icon}
          <span className="font-medium">{statusConfig.label}</span>
        </div>
      </div>

      {/* Chave de Acesso */}
      {invoice.accessKey && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Chave de Acesso</p>
              <p className="font-mono text-sm break-all">{invoice.accessKey}</p>
            </div>
            <button
              onClick={() => copyToClipboard(invoice.accessKey!, 'Chave de acesso')}
              className="p-2 hover:bg-gray-200 rounded-lg"
              title="Copiar chave"
            >
              <FiCopy />
            </button>
          </div>
          {invoice.protocol && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-sm text-gray-600">
                Protocolo: <span className="font-mono">{invoice.protocol}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mensagem de Erro */}
      {invoice.status === 'ERROR' && invoice.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Erro na emissão</p>
              <p className="text-red-700 text-sm mt-1">{invoice.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Motivo do Cancelamento */}
      {invoice.status === 'CANCELLED' && invoice.cancelReason && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <FiXCircle className="text-gray-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-800">Cancelada em {formatDate(invoice.cancelledAt)}</p>
              <p className="text-gray-700 text-sm mt-1">{invoice.cancelReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ações Principais */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          {invoice.danfeUrl && (
            <a
              href={invoice.danfeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiDownload />
              DANFE (PDF)
            </a>
          )}
          
          {invoice.xmlUrl && (
            <a
              href={invoice.xmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <FiDownload />
              XML
            </a>
          )}

          <button
            onClick={handleConsultaSefaz}
            disabled={!invoice.accessKey || actionLoading === 'consulta'}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw className={actionLoading === 'consulta' ? 'animate-spin' : ''} />
            Consultar SEFAZ
          </button>

          {canCCe && (
            <button
              onClick={() => setShowCCeModal(true)}
              disabled={actionLoading === 'cce'}
              className="flex items-center gap-2 px-4 py-2 border border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50"
            >
              <FiEdit3 />
              Carta de Correção
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading === 'cancel'}
              className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-700 rounded-lg hover:bg-red-50"
            >
              <FiX />
              Cancelar NF-e
            </button>
          )}

          {canRetry && (
            <button
              onClick={handleReenviar}
              disabled={actionLoading === 'reenviar'}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <FiSend className={actionLoading === 'reenviar' ? 'animate-spin' : ''} />
              Reenviar
            </button>
          )}

          <a
            href={`/admin/pedidos/${invoice.order.id}`}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ml-auto"
          >
            <FiExternalLink />
            Ver Pedido
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados da NF-e */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiInfo className="text-blue-600" />
              Dados da NF-e
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Número</p>
                <p className="font-medium">{invoice.invoiceNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Série</p>
                <p className="font-medium">{invoice.series || '1'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">CFOP</p>
                <p className="font-medium">{invoice.cfop || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Natureza da Operação</p>
                <p className="font-medium">{invoice.naturezaOperacao || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data Emissão</p>
                <p className="font-medium">{formatDate(invoice.issuedAt)}</p>
              </div>
            </div>
          </div>

          {/* Emitente */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiPackage className="text-green-600" />
              Emitente
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Razão Social</p>
                <p className="font-medium">{invoice.emitenteNome || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">CNPJ</p>
                <p className="font-medium">{formatCPFCNPJ(invoice.emitenteCnpj)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">IE</p>
                <p className="font-medium">{invoice.emitenteIE || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Endereço</p>
                <p className="font-medium">
                  {invoice.emitenteLogradouro && (
                    <>
                      {invoice.emitenteLogradouro}, {invoice.emitenteNumero}
                      {invoice.emitenteComplemento && ` - ${invoice.emitenteComplemento}`}
                      <br />
                      {invoice.emitenteBairro}, {invoice.emitenteMunicipio}/{invoice.emitenteUF}
                      {invoice.emitenteCEP && ` - CEP: ${invoice.emitenteCEP}`}
                    </>
                  ) || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Destinatário */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiUser className="text-purple-600" />
              Destinatário
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Nome/Razão Social</p>
                <p className="font-medium">{invoice.destinatarioNome || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">CPF/CNPJ</p>
                <p className="font-medium">
                  {formatCPFCNPJ(invoice.destinatarioCpf || invoice.destinatarioCnpj)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">E-mail</p>
                <p className="font-medium">{invoice.order.buyerEmail || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Endereço</p>
                <p className="font-medium">
                  {invoice.destinatarioLogradouro && (
                    <>
                      {invoice.destinatarioLogradouro}, {invoice.destinatarioNumero}
                      {invoice.destinatarioComplemento && ` - ${invoice.destinatarioComplemento}`}
                      <br />
                      {invoice.destinatarioBairro}, {invoice.destinatarioMunicipio}/{invoice.destinatarioUF}
                      {invoice.destinatarioCEP && ` - CEP: ${invoice.destinatarioCEP}`}
                    </>
                  ) || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiPackage className="text-orange-600" />
              Produtos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Produto</th>
                    <th className="px-4 py-2 text-center">Qtd</th>
                    <th className="px-4 py-2 text-right">Valor Unit.</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Histórico de Eventos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiCalendar className="text-indigo-600" />
              Histórico de Eventos
            </h2>
            {invoice.events && invoice.events.length > 0 ? (
              <div className="space-y-4">
                {invoice.events.map((event) => {
                  const eventConfig = getEventTypeLabel(event.type)
                  return (
                    <div key={event.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className={`px-2 py-1 text-xs rounded ${eventConfig.color}`}>
                        {eventConfig.label}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{event.description}</p>
                        {event.protocol && (
                          <p className="text-xs text-gray-500 mt-1">
                            Protocolo: {event.protocol}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(event.createdAt)}
                          {event.createdBy && ` • ${event.createdBy}`}
                        </p>
                      </div>
                      {event.xmlUrl && (
                        <a
                          href={event.xmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Baixar XML do evento"
                        >
                          <FiDownload />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhum evento registrado</p>
            )}
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Valores */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiHash className="text-green-600" />
              Valores
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Produtos</span>
                <span>{formatCurrency(invoice.valorProdutos)}</span>
              </div>
              {invoice.valorFrete && invoice.valorFrete > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Frete</span>
                  <span>{formatCurrency(invoice.valorFrete)}</span>
                </div>
              )}
              {invoice.valorDesconto && invoice.valorDesconto > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(invoice.valorDesconto)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(invoice.valorTotal)}</span>
              </div>
            </div>
          </div>

          {/* Tributos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Tributos</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">ICMS</span>
                <span>{formatCurrency(invoice.valorIcms)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">PIS</span>
                <span>{formatCurrency(invoice.valorPis)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">COFINS</span>
                <span>{formatCurrency(invoice.valorCofins)}</span>
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Datas</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Criada em</p>
                <p>{formatDate(invoice.createdAt)}</p>
              </div>
              {invoice.issuedAt && (
                <div>
                  <p className="text-gray-600">Emitida em</p>
                  <p>{formatDate(invoice.issuedAt)}</p>
                </div>
              )}
              {invoice.cancelledAt && (
                <div>
                  <p className="text-gray-600">Cancelada em</p>
                  <p>{formatDate(invoice.cancelledAt)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Última atualização</p>
                <p>{formatDate(invoice.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4 text-red-600 flex items-center gap-2">
              <FiX />
              Cancelar Nota Fiscal
            </h3>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> O cancelamento de NF-e só pode ser realizado em até 24 horas 
                após a autorização. Após esse prazo, só é possível emitir uma nota de estorno.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Justificativa do Cancelamento *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo do cancelamento (mínimo 15 caracteres)"
                className="w-full border rounded-lg px-3 py-2 h-24 resize-none"
                maxLength={255}
              />
              <p className="text-xs text-gray-500 mt-1">
                {cancelReason.length}/255 caracteres (mínimo 15)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={actionLoading === 'cancel'}
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading === 'cancel' || cancelReason.trim().length < 15}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'cancel' ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <FiX />
                    Confirmar Cancelamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Carta de Correção */}
      {showCCeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4 text-yellow-600 flex items-center gap-2">
              <FiEdit3 />
              Carta de Correção Eletrônica (CC-e)
            </h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>A CC-e pode ser usada para:</strong>
              </p>
              <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                <li>Corrigir dados cadastrais</li>
                <li>Alterar data de saída</li>
                <li>Corrigir códigos fiscais</li>
                <li>Outras informações da NF-e</li>
              </ul>
              <p className="text-sm text-yellow-800 mt-2">
                <strong>Não pode alterar:</strong> valores, quantidades, dados do emitente/destinatário,
                impostos, número, série, ou data de emissão.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Texto da Correção *
              </label>
              <textarea
                value={cceText}
                onChange={(e) => setCceText(e.target.value)}
                placeholder="Descreva a correção a ser realizada (mínimo 15 caracteres)"
                className="w-full border rounded-lg px-3 py-2 h-32 resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {cceText.length}/1000 caracteres (mínimo 15)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCCeModal(false)
                  setCceText('')
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={actionLoading === 'cce'}
              >
                Voltar
              </button>
              <button
                onClick={handleCCe}
                disabled={actionLoading === 'cce' || cceText.trim().length < 15}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'cce' ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiSend />
                    Enviar CC-e
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
