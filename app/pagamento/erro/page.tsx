'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FiXCircle } from 'react-icons/fi'

export default function PagamentoErroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const message = searchParams?.get('message')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <FiXCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pagamento Falhou
        </h1>
        <p className="text-gray-600 mb-6">
          {message || 'Houve um erro ao processar seu pagamento. Tente novamente.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-700"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => router.push('/vendedor/dashboard')}
            className="flex-1 border border-gray-300 px-6 py-3 rounded-md font-medium hover:bg-gray-50"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  )
}
