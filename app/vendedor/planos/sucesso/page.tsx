'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FiCheckCircle, FiLoader, FiArrowRight } from 'react-icons/fi'

export default function PagamentoSucessoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()
  const [checking, setChecking] = useState(true)
  const [activated, setActivated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (sessionStatus === 'authenticated') {
      checkPayment()
    }
  }, [sessionStatus])

  const checkPayment = async () => {
    try {
      // Tentar verificar e ativar a assinatura
      const response = await fetch('/api/seller/subscription/check-payment', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.paid) {
        setActivated(true)
      } else {
        // Tentar novamente em alguns segundos (pode demorar para processar)
        setTimeout(async () => {
          const retryResponse = await fetch('/api/seller/subscription/check-payment', {
            method: 'POST'
          })
          const retryData = await retryResponse.json()
          
          if (retryData.paid) {
            setActivated(true)
          } else {
            setError('Seu pagamento está sendo processado. Você receberá uma confirmação em breve.')
          }
          setChecking(false)
        }, 3000)
        return
      }
    } catch (err) {
      setError('Erro ao verificar pagamento')
    } finally {
      setChecking(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="animate-spin h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificando Pagamento</h1>
          <p className="text-gray-600">Aguarde enquanto confirmamos seu pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {activated ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="text-green-600" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Pagamento Confirmado!</h1>
            <p className="text-gray-600 mb-8">
              Sua assinatura foi ativada com sucesso. Agora você pode aproveitar todos os recursos do seu plano.
            </p>
            <button
              onClick={() => router.push('/vendedor/dashboard')}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2"
            >
              Ir para o Dashboard
              <FiArrowRight />
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiLoader className="text-yellow-600" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Processando Pagamento</h1>
            <p className="text-gray-600 mb-8">
              {error || 'Seu pagamento está sendo processado. Isso pode levar alguns minutos.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => checkPayment()}
                className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
              >
                Verificar Novamente
              </button>
              <button
                onClick={() => router.push('/vendedor/dashboard')}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-medium"
              >
                Ir para o Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
