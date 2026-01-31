'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiCheck, FiX, FiStar, FiCreditCard, FiClock, FiInfo, FiAlertTriangle } from 'react-icons/fi'
import toast from 'react-hot-toast'

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
}

interface Subscription {
  id: string
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED'
  startDate: string
  endDate: string
  trialEndDate?: string
  price: number
  billingCycle: string
  nextBillingDate?: string
  autoRenew: boolean
  plan: Plan
}

export default function PlanosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const semPlano = searchParams?.get('sem-plano') === 'true'
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (session?.user?.role !== 'SELLER') {
      router.push('/')
      return
    }

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      const [plansResponse, subscriptionResponse] = await Promise.all([
        fetch('/api/seller/plans/available'),
        fetch('/api/seller/subscription')
      ])

      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(plansData)
      }

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json()
        setCurrentSubscription(subscriptionData)
      }
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!session?.user) return

    setSubscribing(planId)
    try {
      const response = await fetch('/api/seller/subscription/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Se a assinatura requer pagamento (não tem trial ou trial expirou)
        if (data.requiresPayment || data.status === 'PENDING_PAYMENT') {
          toast.success('Plano selecionado! Redirecionando para pagamento...')
          router.push('/vendedor/planos/pagamento')
        } else {
          // Trial ou plano gratuito - vai direto para dashboard
          toast.success('Assinatura realizada com sucesso!')
          router.push('/vendedor/dashboard')
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao assinar plano')
      }
    } catch (error) {
      toast.error('Erro ao assinar plano')
    } finally {
      setSubscribing(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return

    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return

    try {
      const response = await fetch('/api/seller/subscription/cancel', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Assinatura cancelada com sucesso!')
        fetchData()
      } else {
        toast.error('Erro ao cancelar assinatura')
      }
    } catch (error) {
      toast.error('Erro ao cancelar assinatura')
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

  const getStatusText = (status: string) => {
    const statusMap = {
      'TRIAL': 'Em Trial',
      'ACTIVE': 'Ativo',
      'EXPIRED': 'Vencido',
      'CANCELLED': 'Cancelado',
      'SUSPENDED': 'Suspenso'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap = {
      'TRIAL': 'bg-blue-100 text-blue-800',
      'ACTIVE': 'bg-green-100 text-green-800',
      'EXPIRED': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800',
      'SUSPENDED': 'bg-yellow-100 text-yellow-800'
    }
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-8">
        {/* Alerta de Sem Plano */}
        {semPlano && !currentSubscription && (
        <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg shadow-lg">
          <div className="flex items-start">
            <FiAlertTriangle className="text-red-400 flex-shrink-0 mt-1 mr-4" size={32} />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                🚫 Plano Necessário para Acessar a Loja
              </h3>
              <p className="text-red-800 mb-4">
                Para acessar sua loja e começar a vender, você precisa assinar um plano.
              </p>
              <div className="bg-white rounded p-4 border border-red-200">
                <p className="font-semibold text-red-900 mb-2">🎯 Por que preciso de um plano?</p>
                <ul className="space-y-2 text-sm text-red-800">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Acesso completo à plataforma de vendas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Ferramentas de gestão de produtos e pedidos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Integrações com marketplaces (ML, Shopee, etc)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Dropshipping e automação de vendas</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 bg-green-50 rounded p-3 border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>✨ Teste Grátis:</strong> Muitos planos oferecem período de testes gratuito. Escolha abaixo e comece agora!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Planos de Assinatura</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Escolha o plano ideal para sua loja e potencialize suas vendas com nossas ferramentas profissionais.
        </p>
      </div>

        {/* Current Subscription */}
        {currentSubscription && ['ACTIVE', 'TRIAL'].includes(currentSubscription.status) && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiCreditCard className="text-primary-600" />
              Minha Assinatura Atual
            </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Plano Atual</p>
              <p className="font-semibold text-lg">{currentSubscription.plan.name}</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(currentSubscription.status)}`}>
                {getStatusText(currentSubscription.status)}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valor Pago</p>
              <p className="font-semibold">R$ {currentSubscription.price.toFixed(2)} ({getBillingCycleText(currentSubscription.billingCycle)})</p>
              <p className="text-sm text-gray-500">Comissão: {currentSubscription.plan.platformCommission}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {currentSubscription.status === 'TRIAL' ? 'Fim do Trial' : 'Próxima Cobrança'}
              </p>
              <p className="font-semibold">
                {currentSubscription.status === 'TRIAL' && currentSubscription.trialEndDate
                  ? new Date(currentSubscription.trialEndDate).toLocaleDateString('pt-BR')
                  : currentSubscription.nextBillingDate
                    ? new Date(currentSubscription.nextBillingDate).toLocaleDateString('pt-BR')
                    : 'N/A'
                }
              </p>
              {currentSubscription.status === 'ACTIVE' && (
                <button
                  onClick={handleCancelSubscription}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Plans Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Planos Disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.filter(plan => plan.isActive).map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg shadow-lg overflow-hidden ${
              plan.isPopular ? 'ring-2 ring-primary-600 relative' : ''
            }`}
          >
            {plan.isPopular && (
              <div className="bg-primary-600 text-white text-center py-2 text-sm font-medium">
                <FiStar className="inline mr-1" />
                Mais Popular
              </div>
            )}

            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    R$ {plan.price.toFixed(2)}
                  </span>
                  <span className="text-gray-600 ml-1">
                    /{getBillingCycleText(plan.billingCycle).toLowerCase()}
                  </span>
                </div>

                {plan.hasFreeTrial && plan.trialDays && (
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm mb-4">
                    <FiClock className="inline mr-1" />
                    Trial de {plan.trialDays} dias grátis
                  </div>
                )}

                <div className="text-sm text-gray-600 mb-4">
                  Comissão da plataforma: <span className="font-semibold">{plan.platformCommission}%</span>
                </div>
              </div>

              {/* Limits */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Limites:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Produtos: {plan.maxProducts || '∞'}</li>
                  <li>• Pedidos/mês: {plan.maxOrders || '∞'}</li>
                  <li>• Receita/mês: {plan.maxRevenue ? `R$ ${plan.maxRevenue.toLocaleString()}` : '∞'}</li>
                </ul>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Recursos:</h4>
                <ul className="text-sm space-y-2">
                  {[
                    { feature: 'Integração com Marketplaces', included: plan.hasMarketplaceIntegration },
                    { feature: 'Dropshipping', included: plan.hasDropshipping },
                    { feature: 'Relatórios Avançados', included: plan.hasAdvancedAnalytics },
                    { feature: 'Marca Personalizada', included: plan.hasCustomBranding },
                    { feature: 'Suporte Prioritário', included: plan.hasPrioritySupport }
                  ].map(({ feature, included }, index) => (
                    <li key={index} className="flex items-center">
                      {included ? (
                        <FiCheck className="text-green-500 mr-2 flex-shrink-0" />
                      ) : (
                        <FiX className="text-gray-400 mr-2 flex-shrink-0" />
                      )}
                      <span className={included ? 'text-gray-700' : 'text-gray-400'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t">
                {currentSubscription?.plan.id === plan.id && ['ACTIVE', 'TRIAL'].includes(currentSubscription.status) ? (
                  <div className="text-center">
                    <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                      <FiCheck className="mr-2" />
                      Plano Atual
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing === plan.id || (currentSubscription?.status === 'ACTIVE' && currentSubscription?.plan.id !== plan.id)}
                    className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {subscribing === plan.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <FiCreditCard className="mr-2" />
                        {currentSubscription && ['ACTIVE', 'TRIAL'].includes(currentSubscription.status) ? 'Trocar Plano' : 'Escolher Plano'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <FiInfo className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div className="text-blue-800">
            <h4 className="font-medium mb-1">Informações Importantes:</h4>
            <ul className="text-sm space-y-1">
              <li>• Todos os planos incluem trial gratuito para novos usuários</li>
              <li>• Você pode alterar seu plano a qualquer momento</li>
              <li>• A cobrança da comissão é feita sobre cada venda realizada</li>
              <li>• O cancelamento pode ser feito a qualquer momento sem multas</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}