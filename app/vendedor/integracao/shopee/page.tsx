'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ShopeeAuth {
  isConnected: boolean
  partnerId?: number
  shopId?: number
  merchantName?: string
  region?: string
  expiresAt?: string
}

export default function VendedorShopeePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [authData, setAuthData] = useState<ShopeeAuth | null>(null)
  const [error, setError] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [partnerKey, setPartnerKey] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)

  useEffect(() => {
    fetchAuthStatus()
  }, [])

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch('/api/seller/marketplaces/shopee/auth')
      if (response.ok) {
        const data = await response.json()
        setAuthData(data)
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error)
    }
  }

  const handleSaveCredentials = async () => {
    if (!partnerId || !partnerKey) {
      setError('Preencha Partner ID e Partner Key')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/seller/marketplaces/shopee/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: parseInt(partnerId), partnerKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar credenciais')
      }

      toast.success('Credenciais salvas com sucesso!')
      setShowCredentials(false)
      fetchAuthStatus()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthorize = async () => {
    if (!authData?.partnerId) {
      setError('Configure suas credenciais primeiro')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/seller/marketplaces/shopee/auth/authorize')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar URL de autorização')
      }

      window.location.href = data.authUrl
    } catch (error: any) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar sua conta Shopee?')) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/seller/marketplaces/shopee/auth', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao desconectar')
      }

      toast.success('Desconectado com sucesso!')
      setAuthData(null)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const isConnected = authData?.isConnected

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/vendedor/integracao" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4">
          <FiArrowLeft /> Voltar para Integrações
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Integração Shopee</h1>
        <p className="text-gray-600 mt-2">Conecte sua loja Shopee</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Status da Conexão</h2>
        
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-lg">{isConnected ? 'Conectado' : 'Não conectado'}</span>
        </div>

        {isConnected && authData && (
          <div className="bg-gray-50 rounded p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Loja:</span>
                <p className="font-semibold">{authData.merchantName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Shop ID:</span>
                <p className="font-semibold">{authData.shopId}</p>
              </div>
              <div>
                <span className="text-gray-600">Região:</span>
                <p className="font-semibold">{authData.region}</p>
              </div>
              <div>
                <span className="text-gray-600">Token expira em:</span>
                <p className="font-semibold">
                  {authData.expiresAt ? new Date(authData.expiresAt).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credenciais */}
      {(!authData?.partnerId || showCredentials) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Credenciais da API</h2>
          <p className="text-gray-600 mb-4">
            Obtenha suas credenciais no{' '}
            <a href="https://open.shopee.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Shopee Open Platform
            </a>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner ID</label>
              <input
                type="text"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="Seu Partner ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner Key</label>
              <input
                type="password"
                value={partnerKey}
                onChange={(e) => setPartnerKey(e.target.value)}
                placeholder="Seu Partner Key"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveCredentials}
                disabled={isLoading}
                className="bg-purple-500 text-white px-6 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50"
              >
                {isLoading ? 'Salvando...' : 'Salvar Credenciais'}
              </button>
              {showCredentials && (
                <button
                  onClick={() => setShowCredentials(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Autorização */}
      {authData?.partnerId && !isConnected && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Autorização</h2>
          <p className="text-gray-600 mb-4">
            Autorize o acesso à sua loja Shopee para sincronizar produtos e pedidos.
          </p>
          <button
            onClick={handleAuthorize}
            disabled={isLoading}
            className="bg-purple-500 text-white px-6 py-3 rounded-md hover:bg-purple-600 flex items-center gap-2 disabled:opacity-50"
          >
            <FiCheck /> {isLoading ? 'Conectando...' : 'Conectar com Shopee'}
          </button>
        </div>
      )}

      {/* Conectado */}
      {isConnected && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FiCheck className="text-green-600" size={20} />
            <span className="font-semibold text-green-900">Conta Shopee Conectada</span>
          </div>
          <p className="text-green-800 text-sm mb-4">Você pode sincronizar produtos e pedidos agora</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCredentials(true)}
              className="text-green-700 hover:text-green-900 text-sm underline"
            >
              Reconfigurar credenciais
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-red-600 hover:text-red-800 text-sm underline disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>
        </div>
      )}

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-2 text-blue-900">💡 Como funciona?</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Registre-se no Shopee Open Platform</li>
          <li>Obtenha Partner ID e Partner Key</li>
          <li>Salve suas credenciais aqui</li>
          <li>Autorize o acesso à sua loja</li>
          <li>Sincronize produtos e pedidos automaticamente</li>
        </ol>
      </div>
    </div>
  )
}
