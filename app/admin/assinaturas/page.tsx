'use client'

import { useState, useEffect } from 'react'
import { FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiSearch, FiCalendar, FiDollarSign, FiFileText } from 'react-icons/fi'
import toast from 'react-hot-toast'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Subscription {
  id: string
  status: string
  startDate: string
  endDate: string
  price: number
  billingCycle: string
  autoRenew: boolean
  contractNumber?: string
  previousId?: string
  renewedToId?: string
  seller: {
    id: string
    businessName: string
    user: {
      name: string
      email: string
    }
  }
  plan: {
    name: string
    description: string
  }
}

export default function AdminAssinaturasPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions')
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data.subscriptions || [])
      } else {
        toast.error('Erro ao carregar assinaturas')
      }
    } catch (error) {
      toast.error('Erro ao carregar assinaturas')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
    if (!confirm(`Tem certeza que deseja alterar o status desta assinatura para ${newStatus}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        toast.success('Status atualizado com sucesso!')
        fetchSubscriptions()
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIAL: 'bg-blue-100 text-blue-800',
      EXPIRED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      SUSPENDED: 'bg-yellow-100 text-yellow-800',
      PENDING_PAYMENT: 'bg-orange-100 text-orange-800'
    }
    
    const labels = {
      ACTIVE: 'Ativa',
      TRIAL: 'Trial',
      EXPIRED: 'Expirada',
      CANCELLED: 'Cancelada',
      SUSPENDED: 'Suspensa',
      PENDING_PAYMENT: 'Pagamento Pendente'
    }
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const searchLower = search.toLowerCase()
    const matchesSearch = 
      sub.seller?.businessName?.toLowerCase().includes(searchLower) ||
      sub.seller?.user?.name?.toLowerCase().includes(searchLower) ||
      sub.seller?.user?.email?.toLowerCase().includes(searchLower) ||
      sub.plan?.name?.toLowerCase().includes(searchLower) ||
      false
    
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'ACTIVE').length,
    trial: subscriptions.filter(s => s.status === 'TRIAL').length,
    expired: subscriptions.filter(s => s.status === 'EXPIRED').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Assinaturas</h1>
        <p className="text-gray-600 mt-1">Visualize e gerencie assinaturas dos vendedores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <FiFileText className="text-3xl text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ativas</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.active}</p>
            </div>
            <FiCheckCircle className="text-3xl text-green-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trial</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.trial}</p>
            </div>
            <FiClock className="text-3xl text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiradas</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.expired}</p>
            </div>
            <FiXCircle className="text-3xl text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por vendedor, email ou plano..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="ALL">Todos Status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="TRIAL">Trial</option>
            <option value="PENDING_PAYMENT">Pagamento Pendente</option>
            <option value="EXPIRED">Expirada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="SUSPENDED">Suspensa</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma assinatura encontrada
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.seller?.businessName || subscription.seller?.user?.name || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {subscription.seller?.user?.email || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {subscription.plan?.name || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {subscription.billingCycle === 'MONTHLY' ? 'Mensal' :
                         subscription.billingCycle === 'QUARTERLY' ? 'Trimestral' :
                         subscription.billingCycle === 'SEMIANNUAL' ? 'Semestral' : 'Anual'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        R$ {subscription.price?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col gap-1">
                        <span>Início: {new Date(subscription.startDate).toLocaleDateString('pt-BR')}</span>
                        <span>Fim: {new Date(subscription.endDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(subscription.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {subscription.contractNumber ? (
                          <span className="text-xs font-mono text-gray-700">{subscription.contractNumber}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        {subscription.previousId && (
                          <span className="text-xs text-blue-600">↺ Renovação</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={subscription.status}
                        onChange={(e) => handleStatusChange(subscription.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="ACTIVE">Ativar</option>
                        <option value="SUSPENDED">Suspender</option>
                        <option value="CANCELLED">Cancelar</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
