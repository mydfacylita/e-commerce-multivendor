'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: string
  type: 'CREDIT' | 'DEBIT' | 'PENDING'
  description: string
  amount: number
  date: string
  status: string
  reference: string
  balance: number
}

interface Withdrawal {
  id: string
  amount: number
  status: string
  paymentMethod: string
  pixKey?: string
  pixKeyType?: string
  bankName?: string
  agencia?: string
  conta?: string
  contaTipo?: string
  transactionId?: string
  processedAt?: string
  rejectionReason?: string
  sellerNote?: string
  adminNote?: string
  createdAt: string
  updatedAt: string
}

interface Summary {
  balance: number
  totalEarned: number
  totalWithdrawn: number
  pendingPayments?: number
  availableBalance?: number
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

export default function SaquesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'statement' | 'withdrawals'>('statement') // statement = extrato, withdrawals = apenas saques

  // Form state
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [pixKey, setPixKey] = useState('')
  const [pixKeyType, setPixKeyType] = useState('CPF')
  const [bankName, setBankName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [agencia, setAgencia] = useState('')
  const [conta, setConta] = useState('')
  const [contaTipo, setContaTipo] = useState('CORRENTE')
  const [sellerNote, setSellerNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadData()
    }
  }, [status, router, viewMode])

  const loadData = async () => {
    try {
      const res = await fetch(`/api/vendedor/saques?view=${viewMode}`)
      if (res.ok) {
        const data = await res.json()
        if (viewMode === 'statement') {
          setTransactions(data.transactions)
        } else {
          setWithdrawals(data.withdrawals)
        }
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWithdrawals = loadData

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const data: any = {
        amount: parseFloat(amount),
        paymentMethod,
        sellerNote
      }

      if (paymentMethod === 'PIX') {
        data.pixKey = pixKey
        data.pixKeyType = pixKeyType
      } else {
        data.bankName = bankName
        data.bankCode = bankCode
        data.agencia = agencia
        data.conta = conta
        data.contaTipo = contaTipo
      }

      const res = await fetch('/api/vendedor/saques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await res.json()

      if (res.ok) {
        alert('Saque solicitado com sucesso!')
        setShowForm(false)
        resetForm()
        loadWithdrawals()
      } else {
        setError(result.error || 'Erro ao solicitar saque')
      }
    } catch (error) {
      console.error('Erro:', error)
      setError('Erro ao processar solicitação')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (withdrawalId: string) => {
    if (!confirm('Deseja realmente cancelar este saque?')) return

    try {
      const res = await fetch(`/api/vendedor/saques/${withdrawalId}/cancelar`, {
        method: 'POST'
      })

      const result = await res.json()

      if (res.ok) {
        alert('Saque cancelado com sucesso!')
        loadWithdrawals()
      } else {
        alert(result.error || 'Erro ao cancelar saque')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao cancelar saque')
    }
  }

  const resetForm = () => {
    setAmount('')
    setPaymentMethod('PIX')
    setPixKey('')
    setPixKeyType('CPF')
    setBankName('')
    setBankCode('')
    setAgencia('')
    setConta('')
    setContaTipo('CORRENTE')
    setSellerNote('')
    setError('')
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Extrato Financeiro</h1>

        {/* Resumo Financeiro */}
        {summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">Saldo Total</div>
                <div className="text-2xl font-bold text-blue-700">
                  R$ {summary.balance.toFixed(2)}
                </div>
              </div>
              
              {summary.pendingPayments !== undefined && summary.pendingPayments > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-sm text-orange-600 mb-1">Pagamentos DROP Pendentes</div>
                  <div className="text-2xl font-bold text-orange-700">
                    - R$ {summary.pendingPayments.toFixed(2)}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">A pagar à plataforma</div>
                </div>
              )}
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600 mb-1">Disponível para Saque</div>
                <div className="text-2xl font-bold text-green-700">
                  R$ {(summary.availableBalance ?? summary.balance).toFixed(2)}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-1">Total Sacado</div>
                <div className="text-2xl font-bold text-purple-700">
                  R$ {summary.totalWithdrawn.toFixed(2)}
                </div>
              </div>
            </div>

            {summary.pendingPayments !== undefined && summary.pendingPayments > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Atenção:</strong> Você possui <strong>R$ {summary.pendingPayments.toFixed(2)}</strong> em pagamentos de produtos dropshipping pendentes. 
                      Este valor será descontado do seu saldo quando os pedidos forem concluídos.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-4 items-center">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled={!summary || (summary.availableBalance ?? summary.balance) < 0.01}
          >
            {showForm ? 'Cancelar' : 'Solicitar Saque'}
          </button>

          {/* Tabs para alternar entre extrato e saques */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setViewMode('statement')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'statement'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Extrato Completo
            </button>
            <button
              onClick={() => setViewMode('withdrawals')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'withdrawals'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Apenas Saques
            </button>
          </div>
        </div>

        {summary && (summary.availableBalance ?? summary.balance) < 0.01 && (
          <p className="text-sm text-gray-600 mt-2">
            Saldo mínimo para saque: R$ 0,01
          </p>
        )}
      </div>

      {/* Formulário de Saque */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Nova Solicitação de Saque</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Valor do Saque *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={(summary?.availableBalance ?? summary?.balance) || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                Disponível para saque: R$ {((summary?.availableBalance ?? summary?.balance) || 0).toFixed(2)}
              </p>
              {summary?.pendingPayments && summary.pendingPayments > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Há R$ {summary.pendingPayments.toFixed(2)} em pagamentos DROP pendentes
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Método de Pagamento *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="PIX">PIX</option>
                <option value="TED">TED</option>
                <option value="BANK_TRANSFER">Transferência Bancária</option>
              </select>
            </div>

            {paymentMethod === 'PIX' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Chave PIX *</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="PHONE">Telefone</option>
                    <option value="RANDOM">Chave Aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Chave PIX *</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Banco *</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Agência *</label>
                    <input
                      type="text"
                      value={agencia}
                      onChange={(e) => setAgencia(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Conta *</label>
                    <input
                      type="text"
                      value={conta}
                      onChange={(e) => setConta(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Conta *</label>
                  <select
                    value={contaTipo}
                    onChange={(e) => setContaTipo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="CORRENTE">Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Observações (opcional)</label>
              <textarea
                value={sellerNote}
                onChange={(e) => setSellerNote(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Processando...' : 'Solicitar Saque'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Transações (Extrato) ou Saques */}
      {viewMode === 'statement' ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-bold">Extrato de Transações</h2>
            <p className="text-sm text-gray-600 mt-1">
              Histórico completo de vendas, saques e movimentações
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma transação realizada ainda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débito</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{transaction.description}</div>
                        <div className="text-xs text-gray-500">Ref: {transaction.reference}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {transaction.type === 'CREDIT' && (
                          <span className="text-green-600 font-medium">
                            + R$ {transaction.amount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {transaction.type === 'DEBIT' && (
                          <span className="text-red-600 font-medium">
                            - R$ {transaction.amount.toFixed(2)}
                          </span>
                        )}
                        {transaction.type === 'PENDING' && (
                          <span className="text-yellow-600 font-medium text-xs">
                            (Pendente)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`font-semibold ${
                          transaction.balance >= 0 ? 'text-gray-900' : 'text-red-600'
                        }`}>
                          R$ {transaction.balance.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-bold">Histórico de Saques</h2>
          </div>

          {withdrawals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum saque realizado ainda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(withdrawal.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        R$ {withdrawal.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {withdrawal.paymentMethod}
                        {withdrawal.paymentMethod === 'PIX' && withdrawal.pixKey && (
                          <div className="text-xs text-gray-500">
                            {withdrawal.pixKeyType}: {withdrawal.pixKey}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[withdrawal.status]}`}>
                          {STATUS_LABELS[withdrawal.status]}
                        </span>
                        {withdrawal.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">
                            {withdrawal.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {withdrawal.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(withdrawal.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Cancelar
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
      )}
    </div>
  )
}
