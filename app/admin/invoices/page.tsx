'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { FiFileText, 
  FiDownload, 
  FiX, 
  FiSearch, 
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiXCircle
} from 'react-icons/fi'
interface Invoice {
  id: string
  invoiceNumber: string | null
  accessKey: string | null
  status: string
  type: string
  valorTotal: number
  issuedAt: string | null
  createdAt: string
  order: {
    id: string
    buyerName: string
    buyerCpf: string
    total: number
  }
  pdfUrl: string | null
  danfeUrl: string | null
  xmlUrl: string | null
}

export default function AdminInvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadInvoices()
  }, [page, filters])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.search && { search: filters.search })
      })

      const res = await fetch(`/api/admin/invoices?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar notas fiscais')

      const data = await res.json()
      setInvoices(data.data)
      setTotalPages(data.pagination.totalPages)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInvoice = async () => {
    if (!selectedInvoice || !cancelReason.trim()) {
      toast.error('Motivo de cancelamento é obrigatório')
      return
    }

    if (cancelReason.trim().length < 10) {
      toast.error('Motivo deve ter no mínimo 10 caracteres')
      return
    }

    try {
      setCancelling(true)
      const res = await fetch(`/api/admin/invoices/${selectedInvoice.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      toast.success('Nota fiscal cancelada com sucesso')
      setShowCancelModal(false)
      setCancelReason('')
      setSelectedInvoice(null)
      loadInvoices()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCancelling(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return <FiCheckCircle className="text-green-500" />
      case 'PROCESSING':
        return <FiClock className="text-blue-500" />
      case 'PENDING':
        return <FiClock className="text-yellow-500" />
      case 'ERROR':
        return <FiAlertCircle className="text-red-500" />
      case 'CANCELLED':
        return <FiXCircle className="text-gray-500" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      ISSUED: 'Emitida',
      CANCELLED: 'Cancelada',
      ERROR: 'Erro'
    }
    return labels[status] || status
  }

  const getTypeLabel = (type: string) => {
    return type === 'ADMIN' ? 'Administrativa' : 'Vendedor'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notas Fiscais</h1>
          <p className="text-gray-600">Gerenciar emissão de notas fiscais</p>
        </div>
        <button
          onClick={() => router.push('/admin/invoices/issue')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FiFileText />
          Emitir Nota Fiscal
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
          >
            <FiFilter />
            Filtros
          </button>

          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, chave ou CPF..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="PROCESSING">Processando</option>
                <option value="ISSUED">Emitida</option>
                <option value="CANCELLED">Cancelada</option>
                <option value="ERROR">Erro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Todos</option>
                <option value="ADMIN">Administrativa</option>
                <option value="SELLER">Vendedor</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Notas Fiscais */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <FiFileText className="mx-auto text-gray-400 text-5xl mb-4" />
          <p className="text-gray-600">Nenhuma nota fiscal encontrada</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Número/Chave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium">
                          {invoice.invoiceNumber || 'Aguardando'}
                        </div>
                        {invoice.accessKey && (
                          <div className="text-gray-500 text-xs truncate max-w-xs">
                            {invoice.accessKey}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => router.push(`/admin/pedidos/${invoice.order.id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        #{invoice.order.id.substring(0, 8)}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium">{invoice.order.buyerName}</div>
                        <div className="text-gray-500">{invoice.order.buyerCpf}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.type === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {getTypeLabel(invoice.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invoice.status)}
                        <span className="text-sm">{getStatusLabel(invoice.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      R$ {invoice.valorTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {invoice.pdfUrl && (
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="Baixar PDF"
                          >
                            <FiDownload />
                          </a>
                        )}
                        {invoice.status === 'ISSUED' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setShowCancelModal(true)
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Cancelar"
                          >
                            <FiX />
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/invoices/${invoice.id}`)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Cancelamento */}
      {showCancelModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Cancelar Nota Fiscal</h3>
            <p className="text-gray-600 mb-4">
              Nota Fiscal: {selectedInvoice.invoiceNumber}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Motivo do Cancelamento *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo do cancelamento (mínimo 10 caracteres)"
                className="w-full border rounded-lg px-3 py-2 h-24"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {cancelReason.length}/500 caracteres
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                  setSelectedInvoice(null)
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={cancelling}
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={cancelling || cancelReason.trim().length < 10}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
