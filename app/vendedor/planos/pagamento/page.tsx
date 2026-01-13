'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiLoader, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi'

interface SubscriptionData {
  id: string
  planId: string
  status: string
  price: number
  billingCycle: string
  startDate: string
  endDate: string
  plan: {
    name: string
    description: string
  }
}

export default function PagamentoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/seller/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Erro ao buscar subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    setProcessing(true)
    try {
      // Aqui você integraria com gateway de pagamento real
      // Por enquanto, vou simular com um endpoint de teste
      const response = await fetch('/api/seller/subscription/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        alert('Pagamento confirmado! Redirecionando...')
        router.push('/vendedor/dashboard')
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao processar pagamento')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-600 mb-4">Nenhuma assinatura encontrada</p>
          <button
            onClick={() => router.push('/vendedor/planos')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Escolher Plano
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-2">
            <FiClock className="h-6 w-6 text-yellow-600" />
            <h1 className="text-2xl font-bold">Pagamento Pendente</h1>
          </div>
          <p className="text-gray-600">
            Complete o pagamento para ativar sua assinatura
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Detalhes do Plano */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{subscription.plan.name}</h3>
            <p className="text-gray-600 mb-4">{subscription.plan.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Valor:</span>
              <span className="text-2xl font-bold text-blue-600">
                R$ {subscription.price.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">Ciclo:</span>
              <span className="text-sm font-medium">
                {subscription.billingCycle === 'MONTHLY' ? 'Mensal' :
                 subscription.billingCycle === 'QUARTERLY' ? 'Trimestral' : 'Anual'}
              </span>
            </div>
          </div>

          {/* Instruções */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Próximos passos:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Clique no botão abaixo para prosseguir com o pagamento</li>
              <li>Você será redirecionado para o gateway de pagamento</li>
              <li>Complete o pagamento usando seu método preferido</li>
              <li>Após confirmação, seu acesso será liberado automaticamente</li>
            </ol>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={handlePayment}
              disabled={processing}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <FiLoader className="animate-spin h-4 w-4" />
                  Processando...
                </>
              ) : (
                'Prosseguir para Pagamento'
              )}
            </button>
            <button
              onClick={() => router.push('/vendedor/planos')}
              disabled={processing}
              className="px-6 py-3 border border-gray-300 rounded font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Voltar
            </button>
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
            <p className="font-semibold mb-1">⚠️ Importante:</p>
            <p>
              Seu acesso será liberado automaticamente após a confirmação do pagamento.
              Isso pode levar alguns minutos dependendo do método escolhido.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
