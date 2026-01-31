'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Withdrawal {
  id: string
  amount: number
  status: string
  paymentMethod: string
  pixKey?: string
  pixKeyType?: string
  bankName?: string
  bankCode?: string
  agencia?: string
  conta?: string
  contaTipo?: string
  transactionId?: string
  processedAt?: string
  processedBy?: string
  rejectionReason?: string
  sellerNote?: string
  adminNote?: string
  createdAt: string
  updatedAt: string
  seller: {
    id: string
    storeName: string
    balance: number
    user: {
      name: string
      email: string
      phone?: string
      cpf?: string
    }
  }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  PROCESSING: 'Processando',
  COMPLETED: 'Concluído',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado'
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
}

export default function AdminSaquesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'aprovar' | 'rejeitar' | 'concluir' | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadWithdrawals()
    }
  }, [status, router, filterStatus])

  const loadWithdrawals = async () => {
    try {
      const url = filterStatus 
        ? `/api/admin/saques?status=${filterStatus}`
        : '/api/admin/saques'
      
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setWithdrawals(data.withdrawals)
        setStats(data.stats)
      } else if (res.status === 403) {
        alert('Acesso negado. Apenas administradores podem acessar esta página.')
        router.push('/vendedor/dashboard')
      }
    } catch (error) {
      console.error('Erro ao carregar saques:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (withdrawal: Withdrawal, action: 'aprovar' | 'rejeitar' | 'concluir') => {
    setSelectedWithdrawal(withdrawal)
    setActionType(action)
    setShowModal(true)
    setAdminNote('')
    setRejectionReason('')
    setTransactionId('')
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedWithdrawal(null)
    setActionType(null)
    setAdminNote('')
    setRejectionReason('')
    setTransactionId('')
  }

  const handleAction = async () => {
    if (!selectedWithdrawal || !actionType) return

    if (actionType === 'rejeitar' && !rejectionReason) {
      alert('Motivo da rejeição é obrigatório')
      return
    }

    setSubmitting(true)

    try {
      let endpoint = `/api/admin/saques/${selectedWithdrawal.id}/${actionType}`
      let body: any = { adminNote }

      if (actionType === 'rejeitar') {
        body.rejectionReason = rejectionReason
      } else if (actionType === 'concluir') {
        body.transactionId = transactionId
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await res.json()

      if (res.ok) {
        alert(result.message || 'Ação realizada com sucesso!')
        closeModal()
        loadWithdrawals()
      } else {
        alert(result.error || 'Erro ao processar ação')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao processar ação')
    } finally {
      setSubmitting(false)
    }
  }

  const getTotalByStatus = (status: string) => {
    const stat = stats.find(s => s.status === status)
    return stat ? stat._sum.amount || 0 : 0
  }

  const getCountByStatus = (status: string) => {
    const stat = stats.find(s => s.status === status)
    return stat ? stat._count : 0
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Gerenciar Saques</h1>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600 mb-1">Pendentes</div>
          <div className="text-xl font-bold text-yellow-700">
            {getCountByStatus('PENDING')}
          </div>
          <div className="text-sm text-yellow-600">
            R$ {getTotalByStatus('PENDING').toFixed(2)}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">Aprovados</div>
          <div className="text-xl font-bold text-blue-700">
            {getCountByStatus('APPROVED')}
          </div>
          <div className="text-sm text-blue-600">
            R$ {getTotalByStatus('APPROVED').toFixed(2)}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 mb-1">Processando</div>
          <div className="text-xl font-bold text-purple-700">
            {getCountByStatus('PROCESSING')}
          </div>
          <div className="text-sm text-purple-600">
            R$ {getTotalByStatus('PROCESSING').toFixed(2)}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">Concluídos</div>
          <div className="text-xl font-bold text-green-700">
            {getCountByStatus('COMPLETED')}
          </div>
          <div className="text-sm text-green-600">
            R$ {getTotalByStatus('COMPLETED').toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Filtrar por Status:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">Todos</option>
          <option value="PENDING">Pendentes</option>
          <option value="APPROVED">Aprovados</option>
          <option value="PROCESSING">Processando</option>
          <option value="COMPLETED">Concluídos</option>
          <option value="REJECTED">Rejeitados</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      {/* Lista de Saques */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {withdrawals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum saque encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {new Date(withdrawal.createdAt).toLocaleDateString('pt-BR')}
                      <div className="text-xs text-gray-500">
                        {new Date(withdrawal.createdAt).toLocaleTimeString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{withdrawal.seller.storeName}</div>
                      <div className="text-sm text-gray-500">{withdrawal.seller.user.name}</div>
                      <div className="text-xs text-gray-500">{withdrawal.seller.user.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      R$ {withdrawal.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{withdrawal.paymentMethod}</div>
                      {withdrawal.paymentMethod === 'PIX' && withdrawal.pixKey && (
                        <div className="text-xs text-gray-500">
                          {withdrawal.pixKeyType}: {withdrawal.pixKey}
                        </div>
                      )}
                      {withdrawal.paymentMethod !== 'PIX' && withdrawal.bankName && (
                        <div className="text-xs text-gray-500">
                          {withdrawal.bankName}<br />
                          Ag: {withdrawal.agencia} | Conta: {withdrawal.conta}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[withdrawal.status]}`}>
                        {STATUS_LABELS[withdrawal.status]}
                      </span>
                      {withdrawal.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs">
                          {withdrawal.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {withdrawal.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(withdrawal, 'aprovar')}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => openModal(withdrawal, 'rejeitar')}
                            className="text-red-600 hover:text-red-800"
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                      {(withdrawal.status === 'APPROVED' || withdrawal.status === 'PROCESSING') && (
                        <button
                          onClick={() => openModal(withdrawal, 'concluir')}
                          className="text-green-600 hover:text-green-800"
                        >
                          Concluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Ação */}
      {showModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {actionType === 'aprovar' && 'Aprovar Saque'}
                {actionType === 'rejeitar' && 'Rejeitar Saque'}
                {actionType === 'concluir' && 'Concluir Saque'}
              </h2>

              {/* Detalhes do Saque */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                <div><strong>Vendedor:</strong> {selectedWithdrawal.seller.storeName}</div>
                <div><strong>Valor:</strong> R$ {selectedWithdrawal.amount.toFixed(2)}</div>
                <div><strong>Método:</strong> {selectedWithdrawal.paymentMethod}</div>
                {selectedWithdrawal.paymentMethod === 'PIX' && (
                  <div>
                    <strong>Chave PIX:</strong> {selectedWithdrawal.pixKeyType} - {selectedWithdrawal.pixKey}
                  </div>
                )}
                {selectedWithdrawal.paymentMethod !== 'PIX' && (
                  <div>
                    <strong>Dados Bancários:</strong><br />
                    {selectedWithdrawal.bankName}<br />
                    Agência: {selectedWithdrawal.agencia} | Conta: {selectedWithdrawal.conta} ({selectedWithdrawal.contaTipo})
                  </div>
                )}
                {selectedWithdrawal.sellerNote && (
                  <div>
                    <strong>Observação do Vendedor:</strong><br />
                    {selectedWithdrawal.sellerNote}
                  </div>
                )}
              </div>

              {/* Formulário */}
              <div className="space-y-4">
                {actionType === 'rejeitar' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Motivo da Rejeição *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      required
                    />
                  </div>
                )}

                {actionType === 'concluir' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      ID da Transação (opcional)
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="ID do comprovante/transação"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Observações do Admin (opcional)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleAction}
                    disabled={submitting || (actionType === 'rejeitar' && !rejectionReason)}
                    className={`px-6 py-2 rounded-lg text-white transition disabled:opacity-50 ${
                      actionType === 'aprovar' ? 'bg-blue-600 hover:bg-blue-700' :
                      actionType === 'rejeitar' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {submitting ? 'Processando...' : 'Confirmar'}
                  </button>
                  <button
                    onClick={closeModal}
                    disabled={submitting}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
