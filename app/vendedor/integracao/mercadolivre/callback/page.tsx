'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiCheck, FiX, FiLoader } from 'react-icons/fi'
import Link from 'next/link'

export default function VendedorMercadoLivreCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Processando autorização...')

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setMessage('Autorização negada. Você cancelou a conexão com o Mercado Livre.')
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('Código de autorização não encontrado.')
      return
    }

    // Trocar o código por um token de acesso
    const exchangeToken = async () => {
      try {
        // Recuperar code_verifier do sessionStorage
        const codeVerifier = sessionStorage.getItem('ml_code_verifier')
        
        if (!codeVerifier) {
          throw new Error('Code verifier não encontrado. Tente novamente.')
        }

        const response = await fetch('/api/seller/marketplaces/mercadolivre/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, codeVerifier }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Falha ao obter token de acesso')
        }

        // Limpar code_verifier do sessionStorage
        sessionStorage.removeItem('ml_code_verifier')

        setStatus('success')
        setMessage('Conta do Mercado Livre conectada com sucesso!')

        // Redirecionar após 2 segundos
        setTimeout(() => {
          router.push('/vendedor/integracao/mercadolivre')
        }, 2000)
      } catch (error: any) {
        console.error('Erro ao trocar código por token:', error)
        setStatus('error')
        setMessage(error.message || 'Erro ao conectar com o Mercado Livre. Tente novamente.')
      }
    }

    exchangeToken()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <FiLoader className="text-6xl text-yellow-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Conectando...
            </h1>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 rounded-full p-4">
                <FiCheck className="text-6xl text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Sucesso!
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">
              Redirecionando automaticamente...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 rounded-full p-4">
                <FiX className="text-6xl text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Erro na Conexão
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link 
              href="/vendedor/integracao/mercadolivre"
              className="inline-block bg-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
            >
              Tentar Novamente
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
