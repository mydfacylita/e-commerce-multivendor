'use client'

import { useEffect, useState } from 'react'
import { FiCheck, FiClock, FiDollarSign, FiUser } from 'react-icons/fi'

interface Vendedor {
  sellerId: string
  sellerName: string
  sellerOwner: string
  sellerEmail: string
  totalComissao: number
  totalItens: number
  pedidos: Array<{
    orderId: string
    orderNumber: string
    createdAt: string
    total: number
  }>
}

interface PagamentosData {
  vendedores: Vendedor[]
  totalVendedores: number
  totalPagar: number
}

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

export default function PagamentosPage() {
  const [data, setData] = useState<PagamentosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pagamentos' | 'saques'>('saques')
  
  // Estados para saques de vendedores
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [statsWithdrawals, setStatsWithdrawals] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'aprovar' | 'rejeitar' | 'concluir' | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Estados para saques de afiliados
  const [affiliateWithdrawals, setAffiliateWithdrawals] = useState<any[]>([])
  const [affiliateStats, setAffiliateStats] = useState<any[]>([])
  const [affiliateFilterStatus, setAffiliateFilterStatus] = useState('')
  const [selectedAffiliateWithdrawal, setSelectedAffiliateWithdrawal] = useState<any | null>(null)
  const [showAffiliateModal, setShowAffiliateModal] = useState(false)
  const [affiliateActionType, setAffiliateActionType] = useState<'aprovar' | 'rejeitar' | 'concluir' | null>(null)
  const [affiliateAdminNote, setAffiliateAdminNote] = useState('')
  const [affiliateRejectionReason, setAffiliateRejectionReason] = useState('')
  const [affiliateTransactionId, setAffiliateTransactionId] = useState('')
  const [affiliateSubmitting, setAffiliateSubmitting] = useState(false)
  
  // Estados para pagamentos em massa
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState<'PIX' | 'TED' | 'TRANSFERENCIA'>('PIX')
  const [batchNote, setBatchNote] = useState('')

  useEffect(() => {
    loadData()
    loadWithdrawals()
    loadAffiliateWithdrawals()
  }, [filterStatus, affiliateFilterStatus])

  async function loadData() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/financeiro/pagamentos-pendentes')
      if (response.ok) {
        const json = await response.json()
        setData(json)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  async function aprovarPagamento(sellerId: string, sellerName: string) {
    const observacao = prompt(`Aprovar pagamento para ${sellerName}?\n\nDigite uma observação (opcional):`)
    
    if (observacao === null) return
    
    try {
      setProcessando(sellerId)
      const response = await fetch('/api/admin/financeiro/aprovar-pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, observacao })
      })

      if (response.ok) {
        alert('Pagamento aprovado com sucesso!')
        loadData()
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro ao aprovar:', error)
      alert('Erro ao processar pagamento')
    } finally {
      setProcessando(null)
    }
  }

  // Funções para saques de vendedores
  const loadWithdrawals = async () => {
    try {
      const url = filterStatus 
        ? `/api/admin/saques?status=${filterStatus}`
        : '/api/admin/saques'
      
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setWithdrawals(data.withdrawals)
        setStatsWithdrawals(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar saques:', error)
    }
  }

  // Funções para saques de afiliados
  const loadAffiliateWithdrawals = async () => {
    try {
      const url = affiliateFilterStatus
        ? `/api/admin/saques/afiliados?status=${affiliateFilterStatus}`
        : '/api/admin/saques/afiliados'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAffiliateWithdrawals(data.withdrawals)
        setAffiliateStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar saques de afiliados:', error)
    }
  }

  const getAffiliateCountByStatus = (status: string) => {
    const s = affiliateStats.find((x: any) => x.status === status)
    return s ? s._count : 0
  }

  const getAffiliateTotalByStatus = (status: string) => {
    const s = affiliateStats.find((x: any) => x.status === status)
    return s ? (s._sum?.amount || 0) : 0
  }

  const openAffiliateModal = (w: any, action: 'aprovar' | 'rejeitar' | 'concluir') => {
    setSelectedAffiliateWithdrawal(w)
    setAffiliateActionType(action)
    setShowAffiliateModal(true)
    setAffiliateAdminNote('')
    setAffiliateRejectionReason('')
    setAffiliateTransactionId('')
  }

  const closeAffiliateModal = () => {
    setShowAffiliateModal(false)
    setSelectedAffiliateWithdrawal(null)
    setAffiliateActionType(null)
  }

  const handleAffiliateAction = async () => {
    if (!selectedAffiliateWithdrawal || !affiliateActionType) return
    if (affiliateActionType === 'rejeitar' && !affiliateRejectionReason) {
      alert('Motivo da rejeição é obrigatório')
      return
    }
    setAffiliateSubmitting(true)
    try {
      const res = await fetch(`/api/admin/saques/afiliados/${selectedAffiliateWithdrawal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: affiliateActionType,
          adminNote: affiliateAdminNote,
          rejectionReason: affiliateRejectionReason,
          transactionId: affiliateTransactionId
        })
      })
      const result = await res.json()
      if (res.ok) {
        alert(result.message || 'Ação realizada com sucesso!')
        closeAffiliateModal()
        loadAffiliateWithdrawals()
      } else {
        alert(result.error || 'Erro ao processar ação')
      }
    } catch (error) {
      alert('Erro ao processar ação')
    } finally {
      setAffiliateSubmitting(false)
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
    const stat = statsWithdrawals.find(s => s.status === status)
    return stat ? stat._sum.amount || 0 : 0
  }

  const getCountByStatus = (status: string) => {
    const stat = statsWithdrawals.find(s => s.status === status)
    return stat ? stat._count : 0
  }

  // Funções para pagamentos
  const togglePaymentSelection = (withdrawalId: string) => {
    setSelectedPayments(prev => 
      prev.includes(withdrawalId) 
        ? prev.filter(id => id !== withdrawalId)
        : [...prev, withdrawalId]
    )
  }

  const toggleSelectAll = () => {
    const payableWithdrawals = withdrawals.filter(w => 
      w.status === 'APPROVED' || w.status === 'PROCESSING'
    )
    if (selectedPayments.length === payableWithdrawals.length) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(payableWithdrawals.map(w => w.id))
    }
  }

  const handleBatchPayment = async () => {
    if (selectedPayments.length === 0) {
      alert('Selecione pelo menos um saque para processar')
      return
    }

    if (!confirm(`🚀 PROCESSAR PAGAMENTO AUTOMÁTICO via Nubank PJ?\n\n${selectedPayments.length} pagamento(s) serão enviados.\n\n⚠️ Esta ação não pode ser desfeita!`)) {
      return
    }

    setSubmitting(true)
    try {
      const results = await Promise.all(
        selectedPayments.map(id => 
          fetch(`/api/admin/saques/${id}/pagar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminNote: batchNote || `Pagamento automático em lote via Nubank PJ - ${paymentType}`
            })
          })
        )
      )

      const successful = results.filter(r => r.ok).length
      const failed = results.length - successful

      if (failed === 0) {
        alert(`✅ ${successful} pagamento(s) processado(s) e enviado(s) via Nubank PJ!\n\n💰 As transferências PIX foram realizadas automaticamente.`)
      } else {
        alert(`⚠️ Processados: ${successful} sucesso, ${failed} erro(s)\n\nOs que falharam não foram cobrados.`)
      }
      
      setSelectedPayments([])
      setBatchNote('')
      setShowPaymentModal(false)
      loadWithdrawals()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao processar pagamentos em lote')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Pagamentos Pendentes - Dropshipping</h1>
        <p className="text-gray-600">Aprovar e processar pagamentos para vendedores</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('saques')}
            className={`px-4 py-2 border-b-2 transition ${
              activeTab === 'saques'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Saques Vendedores
          </button>
          <button
            onClick={() => setActiveTab('pagamentos')}
            className={`px-4 py-2 border-b-2 transition ${
              activeTab === 'pagamentos'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pagamentos Comissão
          </button>
        </div>
      </div>

      {/* Conteúdo - Saques Afiliados */}
      {activeTab === 'pagamentos' && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-600 mb-1">Pendentes</div>
              <div className="text-xl font-bold text-yellow-700">{getAffiliateCountByStatus('PENDING')}</div>
              <div className="text-sm text-yellow-600">R$ {getAffiliateTotalByStatus('PENDING').toFixed(2)}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">Aprovados (Pagar)</div>
              <div className="text-xl font-bold text-blue-700">{getAffiliateCountByStatus('APPROVED')}</div>
              <div className="text-sm text-blue-600">R$ {getAffiliateTotalByStatus('APPROVED').toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-1">Processando</div>
              <div className="text-xl font-bold text-purple-700">{getAffiliateCountByStatus('PROCESSING')}</div>
              <div className="text-sm text-purple-600">R$ {getAffiliateTotalByStatus('PROCESSING').toFixed(2)}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 mb-1">Concluídos</div>
              <div className="text-xl font-bold text-green-700">{getAffiliateCountByStatus('COMPLETED')}</div>
              <div className="text-sm text-green-600">R$ {getAffiliateTotalByStatus('COMPLETED').toFixed(2)}</div>
            </div>
          </div>

          {/* Filtro */}
          <div className="mb-4">
            <select
              value={affiliateFilterStatus}
              onChange={(e) => setAffiliateFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendentes</option>
              <option value="APPROVED">Aprovados</option>
              <option value="PROCESSING">Processando</option>
              <option value="COMPLETED">Concluídos</option>
              <option value="REJECTED">Rejeitados</option>
            </select>
          </div>

          {/* Tabela de saques de afiliados */}
          <div className="bg-white border rounded-lg overflow-hidden">
            {affiliateWithdrawals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhum saque de afiliado encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afiliado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chave PIX</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {affiliateWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {new Date(w.requestedAt).toLocaleDateString('pt-BR')}
                          <div className="text-xs text-gray-500">{new Date(w.requestedAt).toLocaleTimeString('pt-BR')}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{w.affiliate.name}</div>
                          <div className="text-sm text-gray-500">{w.affiliate.email}</div>
                          {w.affiliate.account && (
                            <div className="text-xs text-gray-400">Saldo: R$ {Number(w.affiliate.account.balance).toFixed(2)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-lg">
                          R$ {Number(w.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {w.pixKey ? (
                            <div className="text-sm font-mono text-blue-600">{w.pixKey}</div>
                          ) : w.bankInfo ? (
                            (() => {
                              try {
                                const b = JSON.parse(w.bankInfo)
                                return <div className="text-xs text-gray-600">{b.banco}<br/>Ag: {b.agencia} / {b.conta}</div>
                              } catch {
                                return <span className="text-gray-400">-</span>
                              }
                            })()
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[w.status] || 'bg-gray-100 text-gray-800'}`}>
                            {STATUS_LABELS[w.status] || w.status}
                          </span>
                          {w.rejectionReason && <div className="text-xs text-red-600 mt-1">{w.rejectionReason}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {w.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <button onClick={() => openAffiliateModal(w, 'aprovar')} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Aprovar</button>
                              <button onClick={() => openAffiliateModal(w, 'rejeitar')} className="text-red-600 hover:text-red-800 text-xs font-medium">Rejeitar</button>
                            </div>
                          )}
                          {(w.status === 'APPROVED' || w.status === 'PROCESSING') && (
                            <button onClick={() => openAffiliateModal(w, 'concluir')} className="text-green-600 hover:text-green-800 text-xs font-medium">Concluir / Pago</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Ação Afiliado */}
      {showAffiliateModal && selectedAffiliateWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {affiliateActionType === 'aprovar' ? 'Aprovar Saque' : affiliateActionType === 'rejeitar' ? 'Rejeitar Saque' : 'Concluir Saque'}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div><strong>Afiliado:</strong> {selectedAffiliateWithdrawal.affiliate.name}</div>
              <div><strong>E-mail:</strong> {selectedAffiliateWithdrawal.affiliate.email}</div>
              <div><strong>Valor:</strong> R$ {Number(selectedAffiliateWithdrawal.amount).toFixed(2)}</div>
              <div><strong>PIX:</strong> {selectedAffiliateWithdrawal.pixKey || 'Não informado'}</div>
            </div>
            {affiliateActionType === 'rejeitar' && (
              <textarea
                value={affiliateRejectionReason}
                onChange={e => setAffiliateRejectionReason(e.target.value)}
                placeholder="Motivo da rejeição *"
                className="w-full border rounded-lg p-2 mb-3 text-sm"
                rows={3}
              />
            )}
            {affiliateActionType === 'concluir' && (
              <input
                type="text"
                value={affiliateTransactionId}
                onChange={e => setAffiliateTransactionId(e.target.value)}
                placeholder="ID da transação (opcional)"
                className="w-full border rounded-lg p-2 mb-3 text-sm"
              />
            )}
            <textarea
              value={affiliateAdminNote}
              onChange={e => setAffiliateAdminNote(e.target.value)}
              placeholder="Observação (opcional)"
              className="w-full border rounded-lg p-2 mb-4 text-sm"
              rows={2}
            />
            <div className="flex gap-3">
              <button
                onClick={handleAffiliateAction}
                disabled={affiliateSubmitting}
                className={`flex-1 text-white py-2 rounded-lg disabled:opacity-50 ${affiliateActionType === 'aprovar' ? 'bg-blue-600 hover:bg-blue-700' : affiliateActionType === 'rejeitar' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {affiliateSubmitting ? 'Processando...' : 'Confirmar'}
              </button>
              <button
                onClick={closeAffiliateModal}
                disabled={affiliateSubmitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo - Saques Vendedores */}
      {activeTab === 'saques' && (
        <>
          {/* Estatísticas Saques */}
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
        </>
      )}

      {/* Modal de Ação para Saques */}
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

      {/* Modal de Processamento em Lote */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                Processar Pagamentos em Lote
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="font-medium mb-2">Resumo do Lote:</div>
                <div className="space-y-1 text-sm">
                  <div>Quantidade: <strong>{selectedPayments.length} pagamento(s)</strong></div>
                  <div>Valor Total: <strong>R$ {withdrawals.filter(w => selectedPayments.includes(w.id)).reduce((sum, w) => sum + w.amount, 0).toFixed(2)}</strong></div>
                </div>
              </div>

              {/* Lista dos pagamentos selecionados */}
              <div className="max-h-60 overflow-y-auto mb-4 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Vendedor</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Método</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {withdrawals
                      .filter(w => selectedPayments.includes(w.id))
                      .map(w => (
                        <tr key={w.id}>
                          <td className="px-3 py-2">
                            <div className="font-medium">{w.seller.storeName}</div>
                            <div className="text-xs text-gray-500">{w.paymentMethod === 'PIX' ? `${w.pixKeyType}: ${w.pixKey}` : `${w.bankName} - Ag: ${w.agencia}`}</div>
                          </td>
                          <td className="px-3 py-2">{w.paymentMethod}</td>
                          <td className="px-3 py-2 text-right font-medium">R$ {w.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Tipo de Pagamento */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tipo de Processamento:</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setPaymentType('PIX')}
                    className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                      paymentType === 'PIX' 
                        ? 'border-green-600 bg-green-50 text-green-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    PIX
                  </button>
                  <button
                    onClick={() => setPaymentType('TED')}
                    className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                      paymentType === 'TED' 
                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    TED
                  </button>
                  <button
                    onClick={() => setPaymentType('TRANSFERENCIA')}
                    className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                      paymentType === 'TRANSFERENCIA' 
                        ? 'border-purple-600 bg-purple-50 text-purple-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Transferência
                  </button>
                </div>
              </div>

              {/* Observações */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Ex: Lote processado via banco XYZ"
                />
              </div>

              {/* Avisos */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="text-sm text-purple-800">
                  <strong>🟣 Pagamento Automático via Nubank PJ</strong>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>As transferências PIX serão processadas automaticamente</li>
                    <li>Os valores serão debitados da sua conta Nubank PJ</li>
                    <li>Transferências PIX são <strong>GRATUITAS</strong> no Nubank</li>
                    <li>Após confirmar, os saques serão marcados como CONCLUÍDOS</li>
                    <li>Você receberá os IDs das transações do Nubank</li>
                  </ul>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-4">
                <button
                  onClick={handleBatchPayment}
                  disabled={submitting}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Processando...' : `Confirmar ${selectedPayments.length} Pagamento(s)`}
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setBatchNote('')
                  }}
                  disabled={submitting}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
