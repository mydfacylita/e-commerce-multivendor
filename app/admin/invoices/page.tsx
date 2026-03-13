'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  FiFileText, FiDownload, FiX, FiSearch, FiFilter,
  FiCheckCircle, FiClock, FiAlertCircle, FiXCircle,
  FiRefreshCw, FiShield, FiChevronLeft, FiChevronRight,
  FiCalendar, FiDollarSign, FiEye, FiExternalLink
} from 'react-icons/fi'

interface Invoice {
  id: string
  invoiceNumber: string | null
  accessKey: string | null
  series: string | null
  status: string
  type: string
  valorTotal: number
  issuedAt: string | null
  createdAt: string
  protocol: string | null
  errorMessage: string | null
  order: {
    id: string
    buyerName: string
    buyerCpf: string
    total: number
  }
  pdfUrl: string | null
  danfeUrl: string | null
  xmlUrl: string | null
  xmlAssinado: string | null
}

interface Stats {
  [status: string]: { count: number; total: number }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ISSUED:     { label: 'Emitida',      color: 'text-green-700',  bg: 'bg-green-100',  icon: FiCheckCircle },
  PROCESSING: { label: 'Processando',  color: 'text-blue-700',   bg: 'bg-blue-100',   icon: FiClock },
  PENDING:    { label: 'Pendente',     color: 'text-yellow-700', bg: 'bg-yellow-100', icon: FiClock },
  ERROR:      { label: 'Erro',         color: 'text-red-700',    bg: 'bg-red-100',    icon: FiAlertCircle },
  CANCELLED:  { label: 'Cancelada',    color: 'text-gray-600',   bg: 'bg-gray-100',   icon: FiXCircle },
}

export default function AdminInvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState<Stats>({})
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: '', type: '', search: '', dateFrom: '', dateTo: '', valueMin: '', valueMax: ''
  })

  // Modal cancelamento
  const [cancelModal, setCancelModal] = useState<{ open: boolean; invoice: Invoice | null }>({ open: false, invoice: null })
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Modal verificar SEFAZ
  const [sefazModal, setSefazModal] = useState<{ open: boolean; invoice: Invoice | null; result: any; loading: boolean }>({
    open: false, invoice: null, result: null, loading: false
  })

  // Reemitindo
  const [reemitindo, setReemitindo] = useState<string | null>(null)

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      if (filters.status) params.set('status', filters.status)
      if (filters.type) params.set('type', filters.type)
      if (filters.search) params.set('search', filters.search)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.valueMin) params.set('valueMin', filters.valueMin)
      if (filters.valueMax) params.set('valueMax', filters.valueMax)

      const res = await fetch(`/api/admin/invoices?${params}`)
      if (!res.ok) {
        const text = await res.text()
        let msg = 'Erro ao carregar notas fiscais'
        try { msg = JSON.parse(text).error || msg } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      setInvoices(data.data || [])
      setTotal(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 1)
      setStats(data.stats || {})
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  const handleCancelInvoice = async () => {
    if (!cancelModal.invoice || cancelReason.trim().length < 10) {
      toast.error('Motivo deve ter no mÃ­nimo 10 caracteres')
      return
    }
    try {
      setCancelling(true)
      const res = await fetch(`/api/admin/invoices/${cancelModal.invoice.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao cancelar')
      }
      toast.success('Nota fiscal cancelada')
      setCancelModal({ open: false, invoice: null })
      setCancelReason('')
      loadInvoices()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCancelling(false)
    }
  }

  const handleVerificarSefaz = async (invoice: Invoice) => {
    setSefazModal({ open: true, invoice, result: null, loading: true })
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}/verificar-sefaz`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao consultar')
      setSefazModal(prev => ({ ...prev, result: data, loading: false }))
    } catch (error: any) {
      setSefazModal(prev => ({ ...prev, result: { status: 'ERRO', xMotivo: error.message }, loading: false }))
    }
  }

  const handleReemitir = async (invoice: Invoice) => {
    if (!confirm(`Reemitir nota ${invoice.invoiceNumber || 'sem nÃºmero'} para o SEFAZ?`)) return
    setReemitindo(invoice.id)
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}/reemitir`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao reemitir')
      toast.success(`âœ… Nota reemitida! Chave: ${data.chaveAcesso?.slice(-8)}...`)
      loadInvoices()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setReemitindo(null)
    }
  }

  const handleDownloadDanfe = (invoice: Invoice) => {
    if (!invoice.xmlAssinado) {
      toast.error('XML nÃ£o disponÃ­vel â€” emita a nota primeiro')
      return
    }
    window.open(`/api/admin/invoices/${invoice.id}/danfe`, '_blank')
  }

  const totalEmitidas = Object.values(stats).reduce((s, v) => s + v.count, 0)
  const valorTotal = Object.entries(stats)
    .filter(([k]) => k !== 'CANCELLED')
    .reduce((s, [, v]) => s + v.total, 0)

  const filterActive = Object.values(filters).some(v => v !== '')

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
          <p className="text-gray-500 text-sm mt-1">Gerenciar emissÃ£o e controle de NF-e</p>
        </div>
        <button
          onClick={() => router.push('/admin/invoices/issue')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <FiFileText size={16} />
          Emitir Nota Fiscal
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { key: 'ISSUED',     label: 'Emitidas',    color: 'border-green-400' },
          { key: 'PENDING',    label: 'Pendentes',   color: 'border-yellow-400' },
          { key: 'ERROR',      label: 'Com Erro',    color: 'border-red-400' },
          { key: 'CANCELLED',  label: 'Canceladas',  color: 'border-gray-400' },
          { key: 'PROCESSING', label: 'Processando', color: 'border-blue-400' },
        ].map(({ key, label, color }) => {
          const s = stats[key] || { count: 0, total: 0 }
          const cfg = STATUS_CONFIG[key]
          const Icon = cfg.icon
          return (
            <button
              key={key}
              onClick={() => { setFilters(f => ({ ...f, status: f.status === key ? '' : key })); setPage(1) }}
              className={`bg-white rounded-lg border-l-4 ${color} p-3 text-left hover:shadow-md transition-shadow ${filters.status === key ? 'ring-2 ring-blue-400' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <Icon size={14} className={cfg.color} />
              </div>
              <div className="text-xl font-bold text-gray-800">{s.count}</div>
              <div className="text-xs text-gray-400">R$ {s.total.toFixed(2)}</div>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Busca */}
          <div className="flex-1 min-w-[200px] relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por nÃºmero, chave, CPF ou nome..."
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Status rÃ¡pido */}
          <select
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Tipo */}
          <select
            value={filters.type}
            onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Todos os tipos</option>
            <option value="ADMIN">Administrativa</option>
            <option value="SELLER">Vendedor</option>
          </select>

          {/* Toggle filtros avanÃ§ados */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <FiFilter size={14} />
            AvanÃ§ado
          </button>

          {filterActive && (
            <button
              onClick={() => { setFilters({ status: '', type: '', search: '', dateFrom: '', dateTo: '', valueMin: '', valueMax: '' }); setPage(1) }}
              className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
            >
              <FiX size={14} /> Limpar
            </button>
          )}

          <button
            onClick={loadInvoices}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-50"
            title="Atualizar"
          >
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><FiCalendar size={12} /> Data Inicial</label>
              <input type="date" value={filters.dateFrom} onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><FiCalendar size={12} /> Data Final</label>
              <input type="date" value={filters.dateTo} onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><FiDollarSign size={12} /> Valor MÃ­nimo</label>
              <input type="number" step="0.01" placeholder="R$ 0,00" value={filters.valueMin} onChange={e => { setFilters(f => ({ ...f, valueMin: e.target.value })); setPage(1) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><FiDollarSign size={12} /> Valor MÃ¡ximo</label>
              <input type="number" step="0.01" placeholder="R$ 9999,99" value={filters.valueMax} onChange={e => { setFilters(f => ({ ...f, valueMax: e.target.value })); setPage(1) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        )}
      </div>

      {/* Total encontrado */}
      {!loading && (
        <div className="text-sm text-gray-500 mb-3 flex items-center justify-between">
          <span>{total} nota{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''} Â· Total R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span>PÃ¡gina {page} de {totalPages}</span>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-100">
          <FiFileText className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium">Nenhuma nota fiscal encontrada</p>
          <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros ou emita uma nova nota</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">NÂº / Chave</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">AÃ§Ãµes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((invoice) => {
                  const cfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.PENDING
                  const Icon = cfg.icon
                  const isSimulated = invoice.protocol?.startsWith('SIMULATED-')
                  const canReemitir = invoice.status === 'ERROR' || invoice.status === 'PENDING' || isSimulated
                  const isReemitindo = reemitindo === invoice.id

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      {/* NÃºmero / Chave */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-gray-800">
                          {invoice.invoiceNumber ? `NF-e ${invoice.series || '1'}.${invoice.invoiceNumber.padStart(6, '0')}` : <span className="text-gray-400 font-sans font-normal text-xs">Aguardando</span>}
                        </div>
                        {invoice.accessKey && (
                          <div
                            className="text-gray-400 font-mono text-xs truncate max-w-[220px] cursor-pointer hover:text-blue-600"
                            onClick={() => { navigator.clipboard.writeText(invoice.accessKey!); toast.success('Chave copiada!') }}
                            title={`Clique para copiar: ${invoice.accessKey}`}
                          >
                            {invoice.accessKey.replace(/(\d{4})/g, '$1 ').trim()}
                          </div>
                        )}
                        {isSimulated && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-0.5">
                            âš  NÃ£o enviada ao SEFAZ
                          </span>
                        )}
                      </td>

                      {/* Pedido */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/admin/pedidos/${invoice.order.id}`)}
                          className="text-blue-600 hover:underline text-sm font-mono flex items-center gap-1"
                        >
                          #{invoice.order.id.substring(0, 8)}
                          <FiExternalLink size={10} />
                        </button>
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{invoice.order.buyerName}</div>
                        <div className="text-xs text-gray-400">{invoice.order.buyerCpf}</div>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${invoice.type === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {invoice.type === 'ADMIN' ? 'Administrativa' : 'Vendedor'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon size={11} />
                          {cfg.label}
                        </span>
                        {invoice.status === 'ERROR' && invoice.errorMessage && (
                          <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={invoice.errorMessage}>
                            {invoice.errorMessage}
                          </div>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-800">
                          R$ {invoice.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        <div>{new Date(invoice.createdAt).toLocaleDateString('pt-BR')}</div>
                        {invoice.issuedAt && <div className="text-xs text-green-600">{new Date(invoice.issuedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>}
                      </td>

                      {/* AÃ§Ãµes */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Ver detalhes */}
                          <button
                            onClick={() => router.push(`/admin/invoices/${invoice.id}`)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                            title="Ver detalhes"
                          >
                            <FiEye size={14} />
                          </button>

                          {/* DANFE */}
                          <button
                            onClick={() => handleDownloadDanfe(invoice)}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-700"
                            title="Baixar DANFE (PDF)"
                          >
                            <FiDownload size={14} />
                          </button>

                          {/* Verificar SEFAZ */}
                          <button
                            onClick={() => handleVerificarSefaz(invoice)}
                            className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-700"
                            title="Verificar status no SEFAZ"
                          >
                            <FiShield size={14} />
                          </button>

                          {/* Reemitir */}
                          {canReemitir && (
                            <button
                              onClick={() => handleReemitir(invoice)}
                              disabled={isReemitindo}
                              className="p-1.5 rounded hover:bg-orange-50 text-orange-500 hover:text-orange-700 disabled:opacity-40"
                              title="Reemitir / Enviar ao SEFAZ"
                            >
                              <FiRefreshCw size={14} className={isReemitindo ? 'animate-spin' : ''} />
                            </button>
                          )}

                          {/* Cancelar */}
                          {invoice.status === 'ISSUED' && !isSimulated && (
                            <button
                              onClick={() => { setCancelModal({ open: true, invoice }); setCancelReason('') }}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                              title="Cancelar NF-e"
                            >
                              <FiX size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* PaginaÃ§Ã£o */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">{total} registros Â· PÃ¡gina {page} de {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  <FiChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm rounded-lg border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                    >{p}</button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Cancelamento */}
      {cancelModal.open && cancelModal.invoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cancelar NF-e</h3>
            <p className="text-gray-500 text-sm mb-4">
              NF-e {cancelModal.invoice.invoiceNumber} Â· Chave: {cancelModal.invoice.accessKey?.slice(-8)}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Motivo do cancelamento *</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo (mÃ­nimo 10 caracteres)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 h-24 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">{cancelReason.length}/500</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelModal({ open: false, invoice: null })} disabled={cancelling}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                Voltar
              </button>
              <button onClick={handleCancelInvoice} disabled={cancelling || cancelReason.trim().length < 10}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Verificar SEFAZ */}
      {sefazModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiShield className="text-green-600" /> Verificar status no SEFAZ
              </h3>
              <button onClick={() => setSefazModal({ open: false, invoice: null, result: null, loading: false })}
                className="text-gray-400 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            {sefazModal.invoice && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
                <div><span className="font-medium">NF-e:</span> {sefazModal.invoice.invoiceNumber || 'Sem nÃºmero'}</div>
                <div className="font-mono text-xs mt-1 truncate">{sefazModal.invoice.accessKey || 'â€”'}</div>
                {sefazModal.invoice.protocol?.startsWith('SIMULATED-') && (
                  <div className="mt-2 text-orange-600 font-medium text-xs bg-orange-50 px-2 py-1 rounded">
                    âš  Esta nota possui protocolo simulado â€” nunca foi transmitida ao SEFAZ
                  </div>
                )}
              </div>
            )}

            {sefazModal.loading ? (
              <div className="flex flex-col items-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3"></div>
                <span className="text-sm">Consultando SEFAZ...</span>
              </div>
            ) : sefazModal.result ? (
              <div>
                {sefazModal.result.isSimulated ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="font-semibold text-orange-700 mb-2">âš  Nota nÃ£o transmitida</div>
                    <p className="text-sm text-orange-600">{sefazModal.result.message}</p>
                  </div>
                ) : sefazModal.result.found && sefazModal.result.status === 'AUTORIZADA' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <FiCheckCircle /> Autorizada pela SEFAZ âœ“
                    </div>
                    <div className="text-sm space-y-1 text-green-600">
                      <div><span className="font-medium">cStat:</span> {sefazModal.result.cStat}</div>
                      <div><span className="font-medium">Protocolo:</span> {sefazModal.result.protocol}</div>
                      {sefazModal.result.dhRecbto && <div><span className="font-medium">Recebido:</span> {new Date(sefazModal.result.dhRecbto).toLocaleString('pt-BR')}</div>}
                    </div>
                  </div>
                ) : sefazModal.result.status === 'CANCELADA' ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-600 mb-1 flex items-center gap-2">
                      <FiXCircle /> Cancelada no SEFAZ
                    </div>
                    <p className="text-sm text-gray-500">cStat: {sefazModal.result.cStat} â€” {sefazModal.result.xMotivo}</p>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="font-semibold text-red-700 mb-1 flex items-center gap-2">
                      <FiAlertCircle /> {sefazModal.result.status === 'NAO_ENCONTRADA' ? 'NF-e nÃ£o encontrada no SEFAZ' : 'Erro na consulta'}
                    </div>
                    <p className="text-sm text-red-600 mt-1">{sefazModal.result.xMotivo}</p>
                    {sefazModal.result.cStat && <p className="text-xs text-red-400 mt-1">cStat: {sefazModal.result.cStat}</p>}
                    {!sefazModal.result.found && sefazModal.invoice && (
                      <button
                        onClick={() => {
                          setSefazModal({ open: false, invoice: null, result: null, loading: false })
                          handleReemitir(sefazModal.invoice!)
                        }}
                        className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
                      >
                        <FiRefreshCw size={14} /> Reemitir para o SEFAZ
                      </button>
                    )}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-3">
                  Ambiente: {sefazModal.result.ambiente || 'â€”'} Â· UF: {sefazModal.result.uf || 'â€”'}
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setSefazModal({ open: false, invoice: null, result: null, loading: false })}
              className="mt-4 w-full px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
