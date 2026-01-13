'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * 🔒 Página de erro personalizada - NÃO expõe detalhes do código
 * Esta página é exibida quando ocorre um erro em qualquer rota
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 🔒 Log seguro - apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Page]', error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Ícone de erro */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100">
            <svg 
              className="w-10 h-10 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ops! Algo deu errado
        </h1>

        {/* Mensagem genérica - NÃO expõe detalhes */}
        <p className="text-gray-600 mb-6">
          Desculpe, ocorreu um erro inesperado. Nossa equipe já foi notificada 
          e está trabalhando para resolver o problema.
        </p>

        {/* 🔒 Mostrar digest apenas para referência (não expõe código) */}
        {error.digest && (
          <p className="text-xs text-gray-400 mb-6">
            Código de referência: {error.digest}
          </p>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            Tentar novamente
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
              />
            </svg>
            Voltar ao início
          </Link>
        </div>

        {/* Suporte */}
        <p className="mt-8 text-sm text-gray-500">
          Precisa de ajuda?{' '}
          <a href="mailto:suporte@mydshop.com.br" className="text-blue-600 hover:underline">
            Entre em contato
          </a>
        </p>
      </div>
    </div>
  )
}
