'use client'

import { useState, useEffect } from 'react'
import { FiDollarSign, FiSave, FiCheck, FiX, FiEye, FiEyeOff } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface MercadoPagoConfig {
  id?: string
  isActive: boolean
  publicKey: string
  accessToken: string
  webhookUrl: string
  environment: 'sandbox' | 'production'
}

export default function MercadoPagoPage() {
  const [config, setConfig] = useState<MercadoPagoConfig>({
    isActive: false,
    publicKey: '',
    accessToken: '',
    webhookUrl: '',
    environment: 'production'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAccessToken, setShowAccessToken] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/payment/mercadopago', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Dados recebidos da API:', data)
        
        if (data.config) {
          // O Prisma retorna config como STRING (precisa fazer parse)
          let savedConfig = data.config.config
          
          // Se for string, fazer parse do JSON
          if (typeof savedConfig === 'string') {
            console.log('📦 Config é STRING, fazendo parse...')
            savedConfig = JSON.parse(savedConfig)
          }
          
          console.log('📦 Config parseado:', savedConfig)
          console.log('📦 publicKey:', savedConfig?.publicKey)
          console.log('📦 accessToken:', savedConfig?.accessToken?.substring(0, 30) + '...')
          
          setConfig({
            id: data.config.id,
            isActive: data.config.isActive ?? false,
            publicKey: savedConfig?.publicKey ?? '',
            accessToken: savedConfig?.accessToken ?? '',
            webhookUrl: savedConfig?.webhookUrl ?? '',
            environment: savedConfig?.environment ?? 'production'
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config.publicKey || !config.accessToken) {
      toast.error('Preencha Public Key e Access Token')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/payment/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        toast.success('Configuração salva com sucesso!')
        fetchConfig()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar configuração')
      }
    } catch (error) {
      toast.error('Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    toast.loading('Testando conexão...', { id: 'test' })
    try {
      const response = await fetch('/api/admin/payment/mercadopago/test', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Conexão testada com sucesso!', { id: 'test' })
      } else {
        toast.error('Erro ao testar conexão', { id: 'test' })
      }
    } catch (error) {
      toast.error('Erro ao testar conexão', { id: 'test' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FiDollarSign size={48} />
            <div>
              <h1 className="text-3xl font-bold mb-2">Mercado Pago</h1>
              <p className="text-blue-100">
                Configure sua integração com Mercado Pago para receber pagamentos
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              config.isActive ? 'bg-green-500' : 'bg-gray-500'
            }`}>
              {config.isActive ? <FiCheck /> : <FiX />}
              {config.isActive ? 'Ativo' : 'Inativo'}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-6">Configurações</h2>

        <div className="space-y-6">
          {/* Status */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.isActive}
                onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <span className="font-medium text-gray-700">Ativar Mercado Pago</span>
            </label>
            <p className="text-sm text-gray-500 mt-1 ml-8">
              Habilite para aceitar pagamentos via Mercado Pago
            </p>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ambiente
            </label>
            <select
              value={config.environment}
              onChange={(e) => setConfig({ ...config, environment: e.target.value as 'sandbox' | 'production' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="sandbox">Sandbox (Teste)</option>
              <option value="production">Produção</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Use Sandbox para testes e Produção para pagamentos reais
            </p>
          </div>

          {/* Public Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Public Key *
            </label>
            <input
              type="text"
              value={config.publicKey}
              onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-1">
              Chave pública para processar pagamentos no frontend
            </p>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token *
            </label>
            <div className="relative">
              <input
                type={showAccessToken ? 'text' : 'password'}
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showAccessToken ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Token de acesso para processar pagamentos no backend
            </p>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL (Opcional)
            </label>
            <input
              type="text"
              value={config.webhookUrl}
              onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
              placeholder="https://seusite.com/api/webhooks/mercadopago"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL para receber notificações de pagamento
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <FiSave />
                Salvar Configuração
              </>
            )}
          </button>

          {config.id && (
            <button
              onClick={handleTest}
              className="px-6 py-3 border border-gray-300 rounded-md font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <FiCheck />
              Testar Conexão
            </button>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-3 text-blue-900">
          📚 Como obter suas credenciais?
        </h3>
        <ol className="space-y-2 text-blue-800 text-sm">
          <li>1. Acesse <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="underline font-medium">Mercado Pago Developers</a></li>
          <li>2. Faça login na sua conta Mercado Pago</li>
          <li>3. Vá em "Suas integrações" → "Credenciais"</li>
          <li>4. Copie a <strong>Public Key</strong> e o <strong>Access Token</strong></li>
          <li>5. Para testes, use as credenciais de Teste (Sandbox)</li>
          <li>6. Para produção, ative sua conta e use as credenciais de Produção</li>
        </ol>

        <div className="mt-4 pt-4 border-t border-blue-200">
          <h4 className="font-semibold mb-2 text-blue-900">💡 Métodos de Pagamento Suportados:</h4>
          <ul className="space-y-1 text-blue-800 text-sm">
            <li>• <strong>Pix:</strong> Pagamento instantâneo</li>
            <li>• <strong>Cartão de Crédito:</strong> Parcelamento em até 12x</li>
            <li>• <strong>Boleto Bancário:</strong> Vencimento em 3 dias úteis</li>
            <li>• <strong>Saldo Mercado Pago:</strong> Pagamento com saldo da conta</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
