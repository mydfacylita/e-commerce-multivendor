'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { ArrowLeft, Package, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReturnRequestItem {
  id: string
  orderId: string
  itemIds: string[]
  reason: string
  description?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  adminNotes?: string
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: string
  completedAt?: string
  order: {
    id: string
    total: number
    buyerName: string
    buyerEmail: string
    createdAt: string
    items: Array<{
      id: string
      productName: string
      quantity: number
      price: number
      imageUrl?: string
    }>
  }
  user: {
    name: string
    email: string
  }
}

const reasonLabels: Record<string, string> = {
  PRODUTO_DANIFICADO: 'Produto danificado',
  PRODUTO_INCORRETO: 'Produto incorreto',
  NAO_ATENDE_EXPECTATIVA: 'Não atende expectativa',
  DEFEITO_FABRICACAO: 'Defeito de fabricação',
  ARREPENDIMENTO: 'Arrependimento',
  OUTRO: 'Outro motivo'
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-800' },
  COMPLETED: { label: 'Concluída', color: 'bg-blue-100 text-blue-800' }
}

export default function DevolucaoAdminPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<ReturnRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequestItem | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadReturnRequests()
  }, [filter])

  const loadReturnRequests = async () => {
    try {
      const response = await fetch(`/api/admin/returns?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests)
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!selectedRequest) return

    const confirmMessage = action === 'approve' 
      ? 'Confirma a aprovação desta devolução?' 
      : 'Confirma a rejeição desta devolução?'
    
    if (!confirm(confirmMessage)) return

    setProcessing(true)

    try {
      const response = await fetch(`/api/admin/returns/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminNotes: adminNotes.trim() || undefined
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Solicitação ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso!`)
        setSelectedRequest(null)
        setAdminNotes('')
        loadReturnRequests()
      } else {
        alert(result.error || 'Erro ao processar solicitação')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao processar solicitação')
    } finally {
      setProcessing(false)
    }
  }

  const calculateReturnValue = (request: ReturnRequestItem) => {
    const selectedItems = request.order.items.filter(item => 
      request.itemIds.includes(item.id)
    )
    return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true
    return request.status === filter.toUpperCase()
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/admin')}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Devoluções</h1>
          <p className="text-gray-600">Aprovar ou rejeitar solicitações de devolução</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setFilter('all')}
        >
          Todas
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'pending' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setFilter('pending')}
        >
          Pendentes
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'approved' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setFilter('approved')}
        >
          Aprovadas
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'rejected' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setFilter('rejected')}
        >
          Rejeitadas
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'completed' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setFilter('completed')}
        >
          Concluídas
        </button>
      </div>

      {/* Lista de Solicitações */}
      <div className="grid gap-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma solicitação de devolução encontrada</p>
            </div>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">
                      Solicitação #{request.id.slice(-8)}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusLabels[request.status].color}`}>
                      {statusLabels[request.status].label}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Pedido:</strong> #{request.orderId}</p>
                    <p><strong>Cliente:</strong> {request.user.name} ({request.user.email})</p>
                    <p><strong>Motivo:</strong> {reasonLabels[request.reason]}</p>
                    <p><strong>Solicitado em:</strong> {formatDateTime(request.requestedAt)}</p>
                    <p><strong>Valor:</strong> {formatCurrency(calculateReturnValue(request))}</p>
                    <p><strong>Itens:</strong> {request.itemIds.length} item(s)</p>
                    {request.description && (
                      <p><strong>Descrição:</strong> {request.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {request.status === 'PENDING' && (
                    <>
                      <button
                        className="px-3 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
                        onClick={() => {
                          setSelectedRequest(request)
                          setAdminNotes('')
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                        onClick={() => {
                          setSelectedRequest(request)
                          setAdminNotes('')
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                Solicitação de Devolução #{selectedRequest.id.slice(-8)}
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Informações da Solicitação */}
              <div>
                <h4 className="font-semibold mb-2">Informações da Solicitação</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${statusLabels[selectedRequest.status].color}`}>
                      {statusLabels[selectedRequest.status].label}
                    </span>
                  </p>
                  <p><strong>Motivo:</strong> {reasonLabels[selectedRequest.reason]}</p>
                  <p><strong>Solicitado em:</strong> {formatDateTime(selectedRequest.requestedAt)}</p>
                  {selectedRequest.description && (
                    <p><strong>Descrição:</strong> {selectedRequest.description}</p>
                  )}
                  {selectedRequest.reviewedAt && (
                    <p><strong>Revisado em:</strong> {formatDateTime(selectedRequest.reviewedAt)}</p>
                  )}
                  {selectedRequest.adminNotes && (
                    <p><strong>Observações do Admin:</strong> {selectedRequest.adminNotes}</p>
                  )}
                </div>
              </div>

              {/* Itens para Devolução */}
              <div>
                <h4 className="font-semibold mb-2">Itens para Devolução</h4>
                <div className="space-y-2">
                  {selectedRequest.order.items
                    .filter(item => selectedRequest.itemIds.includes(item.id))
                    .map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 border rounded">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-600">
                            Qtd: {item.quantity} • {formatCurrency(item.price)} cada
                          </p>
                          <p className="font-medium">
                            Total: {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <p className="font-bold text-lg">
                    Valor Total a Devolver: {formatCurrency(calculateReturnValue(selectedRequest))}
                  </p>
                </div>
              </div>

              {/* Ações do Admin */}
              {selectedRequest.status === 'PENDING' && (
                <div>
                  <h4 className="font-semibold mb-2">Observações do Administrador</h4>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Adicione observações sobre esta análise (opcional)..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mb-4">
                    {adminNotes.length}/500 caracteres
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction(selectedRequest.id, 'approve')}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {processing ? 'Processando...' : 'Aprovar Devolução'}
                    </button>
                    <button
                      onClick={() => handleAction(selectedRequest.id, 'reject')}
                      disabled={processing}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      {processing ? 'Processando...' : 'Rejeitar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Botão Fechar */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setSelectedRequest(null)}
                  disabled={processing}
                  className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}