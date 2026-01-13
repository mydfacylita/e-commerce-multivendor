'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FiClock } from 'react-icons/fi'

export default function PagamentoPendentePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <FiClock className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pagamento Pendente
        </h1>
        <p className="text-gray-600 mb-6">
          Seu pagamento está sendo processado. Você receberá uma confirmação em breve.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6 text-sm text-yellow-800">
          <p className="font-medium mb-1">⏳ Aguardando Confirmação</p>
          <p>
            Boletos podem levar até 3 dias úteis para serem confirmados.
            Você receberá um email quando o pagamento for aprovado.
          </p>
        </div>

        <button
          onClick={() => router.push('/vendedor/dashboard')}
          className="w-full bg-primary-600 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-700"
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )
}
