'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiDollarSign, FiCalendar, FiStar, FiSettings, FiMail } from 'react-icons/fi'
import toast from 'react-hot-toast'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Plan {
  id: string
  name: string
  description: string
  price: number
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'
  maxProducts: number | null
  maxOrders: number | null
  maxRevenue: number | null
  hasMarketplaceIntegration: boolean
  hasDropshipping: boolean
  hasAdvancedAnalytics: boolean
  hasCustomBranding: boolean
  hasPrioritySupport: boolean
  platformCommission: number
  isActive: boolean
  isPopular: boolean
  hasFreeTrial: boolean
  trialDays: number | null
  _count?: {
    subscriptions: number
  }
}

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [selectedPlanForNotification, setSelectedPlanForNotification] = useState<Plan | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      toast.error('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlan = async (id: string, hasSubscriptions: boolean) => {
    if (hasSubscriptions) {
      toast.error('Não é possível excluir um plano com assinaturas ativas!')
      return
    }

    if (!confirm('Tem certeza que deseja excluir este plano?')) return

    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Plano excluído com sucesso!')
        fetchPlans()
      } else {
        toast.error('Erro ao excluir plano')
      }
    } catch (error) {
      toast.error('Erro ao excluir plano')
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/plans/${id}/toggle-status`, {
        method: 'PATCH'
      })

      if (response.ok) {
        toast.success(`Plano ${currentStatus ? 'desativado' : 'ativado'} com sucesso!`)
        fetchPlans()
      } else {
        toast.error('Erro ao alterar status do plano')
      }
    } catch (error) {
      toast.error('Erro ao alterar status do plano')
    }
  }

  const getBillingCycleText = (cycle: string) => {
    const cycles = {
      'MONTHLY': 'Mensal',
      'QUARTERLY': 'Trimestral',
      'SEMIANNUAL': 'Semestral', 
      'ANNUAL': 'Anual'
    }
    return cycles[cycle as keyof typeof cycles] || cycle
  }

  const openNotificationModal = (plan: Plan) => {
    setSelectedPlanForNotification(plan)
    setShowNotificationModal(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Planos</h1>
          <p className="text-gray-600 mt-1">Configure planos de assinatura e notifique vendedores</p>
        </div>
        <Link
          href="/admin/planos/novo"
          className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <FiPlus />
          <span>Novo Plano</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiSettings className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Planos</p>
              <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiUsers className="text-green-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Planos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{plans.filter(p => p.isActive).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiStar className="text-yellow-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Planos Populares</p>
              <p className="text-2xl font-bold text-gray-900">{plans.filter(p => p.isPopular).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiDollarSign className="text-purple-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Assinaturas Totais</p>
              <p className="text-2xl font-bold text-gray-900">
                {plans.reduce((sum, plan) => sum + (plan._count?.subscriptions || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lista de Planos</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciclo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comissão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limites</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assinantes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center">
                        <div className="font-medium text-gray-900">{plan.name}</div>
                        {plan.isPopular && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <FiStar className="mr-1" size={12} />
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{plan.description}</div>
                      {plan.hasFreeTrial && (
                        <div className="text-xs text-blue-600 mt-1">
                          Trial de {plan.trialDays} dias
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-semibold">R$ {plan.price.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getBillingCycleText(plan.billingCycle)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium">{plan.platformCommission}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div>Produtos: {plan.maxProducts ? plan.maxProducts.toLocaleString() : '∞'}</div>
                      <div>Pedidos: {plan.maxOrders ? plan.maxOrders.toLocaleString() : '∞'}/mês</div>
                      <div>Receita: {plan.maxRevenue ? `R$ ${plan.maxRevenue.toLocaleString()}` : '∞'}/mês</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FiUsers className="mr-1" size={16} />
                      {plan._count?.subscriptions || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(plan.id, plan.isActive)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {plan.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      href={`/admin/planos/${plan.id}`}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                    >
                      <FiEdit className="mr-1" size={16} />
                      Editar
                    </Link>
                    
                    <button
                      onClick={() => openNotificationModal(plan)}
                      className="text-purple-600 hover:text-purple-900 inline-flex items-center"
                    >
                      <FiMail className="mr-1" size={16} />
                      Notificar
                    </button>

                    <button
                      onClick={() => handleDeletePlan(plan.id, (plan._count?.subscriptions || 0) > 0)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center"
                    >
                      <FiTrash2 className="mr-1" size={16} />
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Modal */}
      {showNotificationModal && selectedPlanForNotification && (
        <NotificationModal
          plan={selectedPlanForNotification}
          onClose={() => {
            setShowNotificationModal(false)
            setSelectedPlanForNotification(null)
          }}
        />
      )}
    </div>
  )
}

// Modal para envio de notificações
function NotificationModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [notificationData, setNotificationData] = useState({
    subject: `Atualização no Plano ${plan.name}`,
    message: `Informamos que o plano ${plan.name} foi atualizado. Confira as novas configurações em seu painel.`,
    targetAudience: 'plan_subscribers', // 'all_sellers', 'plan_subscribers', 'active_only'
    includeChanges: true
  })
  const [sending, setSending] = useState(false)

  const handleSendNotification = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/admin/plans/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          ...notificationData
        })
      })

      if (response.ok) {
        toast.success('Notificação enviada com sucesso!')
        onClose()
      } else {
        toast.error('Erro ao enviar notificação')
      }
    } catch (error) {
      toast.error('Erro ao enviar notificação')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Notificar Vendedores - {plan.name}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Assunto</label>
            <input
              type="text"
              value={notificationData.subject}
              onChange={(e) => setNotificationData({...notificationData, subject: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mensagem</label>
            <textarea
              value={notificationData.message}
              onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Público-alvo</label>
            <select
              value={notificationData.targetAudience}
              onChange={(e) => setNotificationData({...notificationData, targetAudience: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="plan_subscribers">Apenas assinantes deste plano</option>
              <option value="all_sellers">Todos os vendedores</option>
              <option value="active_only">Apenas vendedores ativos</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeChanges"
              checked={notificationData.includeChanges}
              onChange={(e) => setNotificationData({...notificationData, includeChanges: e.target.checked})}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="includeChanges" className="ml-2 text-sm">
              Incluir detalhes das mudanças no plano
            </label>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSendNotification}
            disabled={sending}
            className="flex-1 bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400"
          >
            {sending ? 'Enviando...' : 'Enviar Notificação'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}