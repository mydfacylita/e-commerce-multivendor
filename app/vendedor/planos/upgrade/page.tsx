'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiCheck, FiStar, FiArrowUp, FiZap, FiShield, FiTrendingUp } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  features: string[]
  maxProducts: number
  maxOrders: number
  commissionRate: number
  isPopular?: boolean
}

export default function UpgradePage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carregar planos disponíveis
      const plansRes = await fetch('/api/seller/plans/available')
      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(plansData)
      }

      // Carregar plano atual
      const subRes = await fetch('/api/seller/subscription')
      if (subRes.ok) {
        const subData = await subRes.json()
        setCurrentPlan(subData.subscription)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (upgrading) return
    
    setUpgrading(true)
    try {
      const res = await fetch('/api/seller/subscription/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Upgrade realizado com sucesso!')
        
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl
        } else {
          router.push('/vendedor/planos/sucesso')
        }
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao realizar upgrade')
      }
    } catch (error) {
      toast.error('Erro ao processar upgrade')
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Filtrar apenas planos superiores ao atual
  const upgradePlans = plans.filter(p => {
    if (!currentPlan?.plan) return true
    return p.price > currentPlan.plan.price
  })

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FiArrowUp className="text-blue-600" />
          Upgrade de Plano
        </h1>
        <p className="text-gray-600 mt-1">
          Desbloqueie mais recursos e aumente suas vendas
        </p>
      </div>

      {/* Plano Atual */}
      {currentPlan?.plan && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mb-8 border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <FiStar className="text-blue-600" size={24} />
            <h2 className="text-lg font-semibold">Seu plano atual</h2>
          </div>
          <p className="text-2xl font-bold text-blue-600">{currentPlan.plan.name}</p>
          <p className="text-gray-600">
            R$ {currentPlan.plan.price.toFixed(2)}/mês • 
            {currentPlan.plan.maxProducts} produtos • 
            {currentPlan.plan.commissionRate}% de comissão
          </p>
        </div>
      )}

      {/* Benefícios do Upgrade */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <FiTrendingUp className="text-green-600" size={20} />
          </div>
          <div>
            <h3 className="font-medium">Mais Vendas</h3>
            <p className="text-sm text-gray-600">Destaque nos resultados de busca</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FiZap className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="font-medium">Mais Produtos</h3>
            <p className="text-sm text-gray-600">Cadastre mais produtos na loja</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FiShield className="text-purple-600" size={20} />
          </div>
          <div>
            <h3 className="font-medium">Menor Comissão</h3>
            <p className="text-sm text-gray-600">Pague menos por venda</p>
          </div>
        </div>
      </div>

      {/* Planos Disponíveis */}
      {upgradePlans.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center">
          <FiStar className="mx-auto text-yellow-500 mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2">Você já tem o melhor plano!</h3>
          <p className="text-gray-600">
            Parabéns, você está aproveitando todos os recursos disponíveis.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upgradePlans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                plan.isPopular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="bg-blue-600 text-white text-center py-1 text-sm font-medium">
                  ⭐ Mais Popular
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                
                <div className="my-4">
                  <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
                  <span className="text-gray-500">/mês</span>
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <FiCheck className="text-green-500" />
                    Até {plan.maxProducts} produtos
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <FiCheck className="text-green-500" />
                    Até {plan.maxOrders} pedidos/mês
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <FiCheck className="text-green-500" />
                    {plan.commissionRate}% de comissão
                  </li>
                  {(plan.features || []).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <FiCheck className="text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {upgrading ? 'Processando...' : 'Fazer Upgrade'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
