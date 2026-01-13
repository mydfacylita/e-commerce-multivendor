'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiCheckCircle, FiLoader } from 'react-icons/fi'

export default function PagamentoSucessoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Aguardar alguns segundos para processar webhook
    setTimeout(() => {
      setLoading(false)
    }, 3000)
  }, [])

  const paymentId = searchParams?.get('payment_id')
  const status = searchParams?.get('status')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {loading ? (
          <>
            <FiLoader className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Processando Pagamento
            </h1>
            <p className="text-gray-600">
              Aguarde enquanto confirmamos seu pagamento...
            </p>
          </>
        ) : (
          <>
            <FiCheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Pagamento Confirmado!
            </h1>
            <p className="text-gray-600 mb-6">
              Seu pagamento foi processado com sucesso.
            </p>
            
            {paymentId && (
              <div className="bg-gray-50 rounded p-4 mb-6 text-sm">
                <p className="text-gray-500">ID do Pagamento:</p>
                <p className="font-mono text-gray-900">{paymentId}</p>
              </div>
            )}

            <button
              onClick={() => router.push('/vendedor/dashboard')}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-700"
            >
              Voltar ao Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
