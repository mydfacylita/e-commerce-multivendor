'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiExternalLink, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface MLStatus {
  connected: boolean
  message: string
  mlUserId?: string
  expiresAt?: string
}

export default function VendedorMercadoLivrePage() {
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  
  // Credenciais
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [credentialsSaved, setCredentialsSaved] = useState(false)
  const [savingCredentials, setSavingCredentials] = useState(false)

  useEffect(() => {
    checkConnection()
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/seller/marketplaces/mercadolivre/credentials')
      if (response.ok) {
        const data = await response.json()
        if (data.clientId) {
          setClientId(data.clientId)
          setCredentialsSaved(true)
        }
        if (data.clientSecret) {
          setClientSecret('••••••••••••••••')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error)
    }
  }

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/seller/marketplaces/mercadolivre/status')
      const data = await response.json()
      setMlStatus(data)
      setIsConnected(data.connected)
    } catch (error) {
      console.error('Erro ao verificar conexão:', error)
      toast.error('Erro ao verificar conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Preencha o App ID e Secret Key')
      return
    }

    setSavingCredentials(true)
    try {
      const response = await fetch('/api/seller/marketplaces/mercadolivre/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Credenciais salvas com sucesso!')
        setCredentialsSaved(true)
      } else {
        toast.error(data.error || 'Erro ao salvar credenciais')
      }
    } catch (error) {
      toast.error('Erro ao salvar credenciais')
    } finally {
      setSavingCredentials(false)
    }
  }

  const handleConnect = async () => {
    if (!credentialsSaved) {
      toast.error('Salve suas credenciais primeiro!')
      return
    }
    
    const codeVerifier = generateRandomString(128)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    
    sessionStorage.setItem('ml_code_verifier', codeVerifier)
    
    const redirectUri = encodeURIComponent(`${window.location.origin}/vendedor/integracao/mercadolivre/callback`)
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}&code_challenge_method=S256`
    
    window.location.href = authUrl
  }

  const generateRandomString = (length: number) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let text = ''
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }

  const generateCodeChallenge = async (codeVerifier: string) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  const handleListProducts = async () => {
    if (!mlStatus?.connected) {
      toast.error('Conecte sua conta do Mercado Livre primeiro')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/seller/marketplaces/mercadolivre/list-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (response.ok) {
        const successCount = data.listedProducts?.length || 0
        const totalCount = data.totalProducts || 0
        toast.success(`${successCount} de ${totalCount} produtos listados com sucesso!`)
      } else {
        toast.error(data.error || 'Erro ao listar produtos')
      }
    } catch (error) {
      toast.error('Erro ao listar produtos')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/vendedor/integracao" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4">
          <FiArrowLeft /> Voltar para Integrações
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Integração Mercado Livre</h1>
        <p className="text-gray-600 mt-2">Configure sua conexão com o Mercado Livre</p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Status da Conexão</h2>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-lg">{isConnected ? 'Conectado' : 'Não conectado'}</span>
          {isConnected && mlStatus?.mlUserId && (
            <span className="text-sm text-gray-600">• ML User ID: {mlStatus.mlUserId}</span>
          )}
        </div>
        {mlStatus?.message && (
          <p className="mt-2 text-gray-600">{mlStatus.message}</p>
        )}
      </div>

      {/* Credenciais */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Credenciais da API</h2>
        <p className="text-gray-600 mb-4">
          Obtenha suas credenciais em{' '}
          <a href="https://developers.mercadolivre.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
            Mercado Livre Developers <FiExternalLink size={14} />
          </a>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">App ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Seu App ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Seu Secret Key"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSaveCredentials}
            disabled={savingCredentials}
            className="bg-yellow-500 text-white px-6 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingCredentials ? 'Salvando...' : credentialsSaved ? 'Atualizar Credenciais' : 'Salvar Credenciais'}
          </button>
        </div>
      </div>

      {/* Autorização */}
      {credentialsSaved && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Autorização</h2>
          {!isConnected ? (
            <div>
              <p className="text-gray-600 mb-4">
                Autorize o acesso à sua conta do Mercado Livre para listar e gerenciar produtos.
              </p>
              <button
                onClick={handleConnect}
                className="bg-yellow-500 text-white px-6 py-3 rounded-md hover:bg-yellow-600 flex items-center gap-2"
              >
                <FiCheck /> Conectar com Mercado Livre
              </button>
            </div>
          ) : (
            <div>
              <p className="text-green-600 font-semibold mb-4">✓ Conta conectada com sucesso!</p>
              <button
                onClick={handleListProducts}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Listando...' : 'Listar Meus Produtos no ML'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-2 text-blue-900">💡 Como funciona?</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Obtenha suas credenciais no Mercado Livre Developers</li>
          <li>Salve suas credenciais aqui</li>
          <li>Autorize o acesso à sua conta</li>
          <li>Liste seus produtos automaticamente no Mercado Livre</li>
        </ol>
      </div>
    </div>
  )
}
