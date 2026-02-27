'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiCheck, FiExternalLink, FiAlertCircle, FiLoader } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ShopeeStatus {
  isConnected: boolean
  adminConfigured: boolean
  shopId?: number
  merchantName?: string
  region?: string
  expiresAt?: string
}

export default function VendedorShopeePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<ShopeeStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/seller/marketplaces/shopee/auth')
      if (res.ok) setStatus(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/seller/marketplaces/shopee/auth/authorize')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao conectar')
      window.location.href = data.authUrl
    } catch (error: any) {
      toast.error(error.message)
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Deseja desconectar sua loja Shopee?')) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/seller/marketplaces/shopee/auth', { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao desconectar')
      toast.success('Desconectado com sucesso!')
      setStatus(prev => prev ? { ...prev, isConnected: false, shopId: undefined, merchantName: undefined } : null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingStatus) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <FiLoader className="animate-spin text-4xl text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/vendedor/integracao" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopee</h1>
          <p className="text-gray-600">Conecte sua loja e sincronize produtos e pedidos</p>
        </div>
      </div>

      {/* Admin não configurou */}
      {!status?.adminConfigured && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <FiAlertCircle className="text-red-500 text-xl flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Integração não configurada</p>
            <p className="text-sm text-red-600">
              O administrador da plataforma precisa configurar as credenciais da Shopee.
            </p>
          </div>
        </div>
      )}

      {/* Status da conexão */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Status da Conexão</h2>

        {status?.isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck className="text-green-600 text-2xl" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Conectado com sucesso!</p>
                <p className="text-sm text-gray-600">{status.merchantName || `Shop ID: ${status.shopId}`}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-lg p-4">
              <div>
                <span className="text-gray-500">Shop ID</span>
                <p className="font-semibold">{status.shopId}</p>
              </div>
              <div>
                <span className="text-gray-500">Região</span>
                <p className="font-semibold">{status.region || 'BR'}</p>
              </div>
              <div>
                <span className="text-gray-500">Token válido até</span>
                <p className="font-semibold">
                  {status.expiresAt ? new Date(status.expiresAt).toLocaleString('pt-BR') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="bg-orange-500 text-white px-5 py-2 rounded-md hover:bg-orange-600 text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <FiExternalLink size={14} /> Reconectar
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
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-gray-600">Não conectado</span>
            </div>
            <button
              onClick={handleConnect}
              disabled={isLoading || !status?.adminConfigured}
              className="bg-orange-500 text-white px-6 py-3 rounded-md hover:bg-orange-600 font-semibold flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><FiLoader className="animate-spin" /> Conectando...</>
              ) : (
                <><FiExternalLink /> Conectar com Shopee</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Como funciona */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-3 text-orange-900">💡 Como funciona?</h3>
        <ol className="space-y-2 text-orange-800 list-decimal list-inside">
          <li>Clique em <strong>"Conectar com Shopee"</strong></li>
          <li>Faça login na sua conta da Shopee</li>
          <li>Autorize o acesso ao aplicativo</li>
          <li>Pronto! Sua loja está conectada</li>
          <li>Seus produtos e pedidos serão sincronizados automaticamente</li>
        </ol>
      </div>
    </div>
  )
}
