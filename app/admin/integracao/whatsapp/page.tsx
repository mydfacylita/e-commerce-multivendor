'use client'

import { useState, useEffect } from 'react'
import { FiMessageCircle, FiCheck, FiX, FiSend, FiInfo, FiExternalLink, FiSave, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface WhatsAppConfig {
  provider: 'cloud' | 'evolution' | 'zapi' | 'disabled'
  phoneNumberId: string
  apiKey: string
  apiUrl: string
  instanceId: string
}

export default function WhatsAppIntegrationPage() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    provider: 'cloud',
    phoneNumberId: '',
    apiKey: '',
    apiUrl: '',
    instanceId: ''
  })
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testPhone, setTestPhone] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/integrations/whatsapp/config')
      if (response.ok) {
        const data = await response.json()
        if (data.config) {
          setConfig({
            provider: data.config.provider || 'cloud',
            phoneNumberId: data.config.phoneNumberId || '',
            apiKey: data.config.apiKey || '',
            apiUrl: data.config.apiUrl || '',
            instanceId: data.config.instanceId || ''
          })
          setIsActive(data.config.provider && data.config.provider !== 'disabled')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (config.provider === 'cloud' && !config.phoneNumberId) {
      toast.error('Phone Number ID é obrigatório para Cloud API')
      return
    }

    if (!config.apiKey || config.apiKey.includes('...')) {
      // Se não foi alterado, ok
    } else if (!config.apiKey) {
      toast.error('Access Token é obrigatório')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/integrations/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          isActive
        })
      })

      if (response.ok) {
        toast.success('Configuração salva com sucesso!')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testPhone) {
      toast.error('Informe um número de telefone para teste')
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/admin/integrations/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Mensagem de teste enviada!')
      } else {
        toast.error(data.error || 'Erro ao enviar teste')
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem de teste')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
          <FiMessageCircle className="text-white" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Business API</h1>
          <p className="text-gray-600">API Oficial da Meta para envio de mensagens</p>
        </div>
        <div className="ml-auto">
          {isActive ? (
            <span className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
              <FiCheck /> Ativo
            </span>
          ) : (
            <span className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-medium">
              <FiX /> Inativo
            </span>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-3">
          <FiInfo /> Como configurar a API do WhatsApp Business (Meta Cloud API)
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-700 text-sm">
          <li>
            Acesse o{' '}
            <a 
              href="https://developers.facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-medium hover:text-blue-900"
            >
              Meta for Developers <FiExternalLink className="inline" size={12} />
            </a>
          </li>
          <li>Crie ou acesse seu aplicativo</li>
          <li>Adicione o produto "WhatsApp" ao seu aplicativo</li>
          <li>Em "WhatsApp &gt; Configuração da API", copie o <strong>Phone Number ID</strong></li>
          <li>Gere um <strong>Access Token permanente</strong> em Configurações &gt; Tokens de acesso</li>
          <li>Registre o número de telefone comercial que receberá as mensagens</li>
        </ol>
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-blue-800 text-sm font-medium">
            📌 URL do Webhook: <code className="bg-white px-2 py-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/whatsapp</code>
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-6">Configurações da Cloud API (Meta)</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.phoneNumberId}
              onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Ex: 123456789012345"
            />
            <p className="text-xs text-gray-500 mt-1">
              Encontrado em WhatsApp &gt; Configuração da API &gt; Número de telefone
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
              placeholder="EAAxxxxxxxxxx..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Token permanente gerado em Configurações do App &gt; Tokens de acesso do sistema
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">
              Ativar integração WhatsApp
            </span>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <FiSave /> Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>

      {/* Teste */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-6">Testar Envio</h2>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="DDD + Número (ex: 11999999999)"
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testing || !isActive}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <FiSend />
            )}
            Enviar Teste
          </button>
        </div>
        
        {!isActive && (
          <p className="text-sm text-amber-600 mt-3 flex items-center gap-2">
            <FiAlertCircle /> Salve e ative a integração antes de testar
          </p>
        )}
      </div>

      {/* Notificações automáticas */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6">Notificações Automáticas</h2>
        
        <p className="text-gray-600 mb-4">
          Quando ativo, o sistema enviará automaticamente:
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <p className="font-medium">PIX Gerado</p>
              <p className="text-sm text-gray-500">Código copia-e-cola do PIX</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📄</span>
            </div>
            <div>
              <p className="font-medium">Boleto Gerado</p>
              <p className="text-sm text-gray-500">Link do boleto para pagamento</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <div>
              <p className="font-medium">Pagamento Confirmado</p>
              <p className="text-sm text-gray-500">Confirmação de pagamento aprovado</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🚚</span>
            </div>
            <div>
              <p className="font-medium">Pedido Enviado</p>
              <p className="text-sm text-gray-500">Código de rastreamento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
