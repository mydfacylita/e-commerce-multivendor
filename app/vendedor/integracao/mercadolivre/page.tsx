'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiExternalLink, FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface MLStatus {
  connected: boolean
  message: string
  mlUserId?: string
  expiresAt?: string
  nickname?: string
}

interface OAuthConfig {
  mercadoLivre: {
    clientId: string | null
    redirectUri: string | null
    configured: boolean
  }
}

export default function VendedorMercadoLivrePage() {
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null)
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    loadOAuthConfig()
    checkConnection()
  }, [])

  const loadOAuthConfig = async () => {
    try {
      const response = await fetch('/api/marketplaces/oauth-config')
      if (response.ok) {
        const data = await response.json()
        setOauthConfig(data)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações OAuth:', error)
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
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!oauthConfig?.mercadoLivre?.configured) {
      toast.error('Integração com Mercado Livre não está configurada. Contate o administrador.')
      return
    }
    
    setConnecting(true)
    
    // Gerar code_verifier e code_challenge para PKCE
    const codeVerifier = generateRandomString(128)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    
    // Salvar code_verifier no sessionStorage para usar no callback
    sessionStorage.setItem('ml_code_verifier', codeVerifier)
    
    const clientId = oauthConfig.mercadoLivre.clientId
    // Usar domínio de produção para o redirect_uri (deve estar configurado no Dev Center do ML)
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'https://mydshop.com.br' 
      : window.location.origin
    const redirectUri = encodeURIComponent(`${baseUrl}/vendedor/integracao/mercadolivre/callback`)
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}&code_challenge_method=S256`
    
    window.location.href = authUrl
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar sua conta do Mercado Livre?')) {
      return
    }

    try {
      const response = await fetch('/api/seller/marketplaces/mercadolivre/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Conta desconectada com sucesso!')
        setIsConnected(false)
        setMlStatus(null)
      } else {
        toast.error('Erro ao desconectar')
      }
    } catch (error) {
      toast.error('Erro ao desconectar')
    }
  }

  // Funções auxiliares para PKCE
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
        const errorCount = data.errorsCount || 0
        
        if (successCount > 0) {
          toast.success(`✅ ${successCount}/${totalCount} produtos listados no Mercado Livre!`)
        }
        
        if (errorCount > 0) {
          toast.error(`❌ ${errorCount} produtos não listados. Veja o console (F12) para detalhes.`)
          console.log('Erros de listagem:', data.errors)
        }
        
        if (successCount === 0 && errorCount === 0) {
          toast('ℹ️ Nenhum produto para listar')
        }
      } else {
        toast.error(data.error || data.message || 'Erro ao listar produtos')
      }
    } catch (error) {
      toast.error('Erro ao listar produtos')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <FiLoader className="animate-spin text-4xl text-yellow-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/vendedor/integracao"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FiArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mercado Livre</h1>
          <p className="text-gray-600">Conecte sua conta e liste seus produtos</p>
        </div>
      </div>

      {/* Status da Conexão */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Status da Conexão</h2>
        
        {!oauthConfig?.mercadoLivre?.configured ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <FiAlertCircle className="text-red-500 text-xl flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Integração não configurada</p>
              <p className="text-sm text-red-600">
                O administrador da plataforma precisa configurar as credenciais do Mercado Livre.
              </p>
            </div>
          </div>
        ) : isConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck className="text-green-600 text-2xl" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Conta conectada</p>
                {mlStatus?.nickname && (
                  <p className="text-sm text-gray-600">
                    Usuário: <strong>{mlStatus.nickname}</strong>
                  </p>
                )}
                {mlStatus?.mlUserId && (
                  <p className="text-xs text-gray-500">ID: {mlStatus.mlUserId}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">
              Sua conta do Mercado Livre ainda não está conectada.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <FiLoader className="animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <FiExternalLink />
                  Conectar com Mercado Livre
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-3">
              Você será redirecionado para o Mercado Livre para autorizar o acesso.
            </p>
          </div>
        )}
      </div>

      {/* Ações */}
      {isConnected && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Publicar Produtos</h2>
          <p className="text-gray-600 mb-4">
            Publique seus produtos no Mercado Livre com um clique. 
            Apenas produtos com estoque disponível serão listados.
          </p>
          
          <button
            onClick={handleListProducts}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <FiLoader className="animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <FiExternalLink />
                Publicar Produtos no Mercado Livre
              </>
            )}
          </button>
        </div>
      )}

      {/* Como funciona */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-3 text-blue-900">💡 Como funciona?</h3>
        <ol className="space-y-2 text-blue-800 list-decimal list-inside">
          <li>Clique em <strong>"Conectar com Mercado Livre"</strong></li>
          <li>Faça login na sua conta do Mercado Livre</li>
          <li>Autorize o acesso do aplicativo</li>
          <li>Pronto! Sua conta está conectada</li>
          <li>Clique em <strong>"Publicar Produtos"</strong> para listar seus produtos</li>
        </ol>
        
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>⚠️ Importante:</strong> Apenas produtos <strong>próprios</strong> podem ser publicados. 
            Produtos de dropshipping não podem ser listados em marketplaces externos.
          </p>
        </div>
      </div>
    </div>
  )
}
