'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DeveloperError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[Developer Portal Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="text-5xl mb-6 opacity-50">⚠️</div>
      <h1 className="text-xl font-bold mb-2">Algo deu errado</h1>
      <p className="text-gray-500 text-sm mb-8 text-center max-w-sm">
        {error?.message?.includes('JSON') || error?.message?.includes('map')
          ? 'Erro ao processar dados da API. Tente novamente.'
          : 'Ocorreu um erro inesperado no portal de desenvolvedores.'}
      </p>
      {process.env.NODE_ENV === 'development' && error?.message && (
        <code className="text-xs text-red-400 bg-red-950 border border-red-900 rounded-lg px-4 py-3 mb-6 max-w-lg text-center break-all">
          {error.message}
        </code>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Tentar novamente
        </button>
        <button
          onClick={() => router.push('/developer/dashboard')}
          className="border border-gray-700 hover:border-gray-500 text-gray-300 px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Voltar ao dashboard
        </button>
      </div>
    </div>
  )
}
