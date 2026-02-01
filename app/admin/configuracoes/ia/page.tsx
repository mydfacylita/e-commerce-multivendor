'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiCpu, FiSave, FiEye, FiEyeOff, FiCheck, FiAlertCircle, FiZap } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface AIConfig {
  provider: 'gemini' | 'openai'
  apiKey: string
  model?: string
  enabled: boolean
}

export default function ConfiguracaoIAPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [config, setConfig] = useState<AIConfig>({
    provider: 'gemini',
    apiKey: '',
    model: '',
    enabled: true
  })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/config/ai')
      if (response.ok) {
        const data = await response.json()
        if (data.config) {
          setConfig(data.config)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config.apiKey.trim()) {
      toast.error('Informe a chave da API')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      toast.success('Configuração salva com sucesso!')
      setHasUnsavedChanges(false)
      setTestResult(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!config.apiKey.trim()) {
      toast.error('Informe a chave da API primeiro')
      return
    }

    // Se tem alterações não salvas, avisar
    if (hasUnsavedChanges) {
      toast.error('Salve as configurações antes de testar')
      return
    }

    setIsTesting(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/admin/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Produto de teste para verificar conexão com a API de IA.',
          productName: 'Produto Teste',
          action: 'improve'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setTestResult('error')
        throw new Error(data.error || 'Erro no teste')
      }

      setTestResult('success')
      toast.success('✅ Conexão com a IA funcionando!')
    } catch (error: any) {
      setTestResult('error')
      toast.error(error.message || 'Erro ao testar conexão')
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/admin/configuracoes"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar para Configurações
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
          <FiCpu className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Inteligência Artificial</h1>
          <p className="text-gray-600">Configure a IA para melhorar descrições de produtos</p>
        </div>
      </div>

      <div className="max-w-2xl bg-white rounded-xl shadow-md p-6 space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <FiZap className={config.enabled ? 'text-green-500' : 'text-gray-400'} />
            <span className="font-medium">Status da IA</span>
          </div>
          <div className="flex items-center gap-4">
            {testResult && (
              <span className={`flex items-center gap-1 text-sm ${testResult === 'success' ? 'text-green-600' : 'text-orange-600'}`}>
                {testResult === 'success' ? <FiCheck /> : <FiAlertCircle />}
                {testResult === 'success' ? 'Conectado' : 'Indisponível'}
              </span>
            )}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => {
                  setConfig({ ...config, enabled: e.target.checked })
                  setHasUnsavedChanges(true)
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-sm font-medium text-gray-900">
                {config.enabled ? 'Ativado' : 'Desativado'}
              </span>
            </label>
          </div>
        </div>

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium mb-2">Provedor de IA</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setConfig({ ...config, provider: 'gemini', model: '' })
                setHasUnsavedChanges(true)
              }}
              className={`p-4 border-2 rounded-lg text-left transition ${
                config.provider === 'gemini' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🔮</span>
                <span className="font-bold">Google Gemini</span>
                {config.provider === 'gemini' && <FiCheck className="text-blue-500 ml-auto" />}
              </div>
              <p className="text-xs text-gray-500">Gratuito • Rápido • Bom para descrições</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfig({ ...config, provider: 'openai', model: 'gpt-3.5-turbo' })
                setHasUnsavedChanges(true)
              }}
              className={`p-4 border-2 rounded-lg text-left transition ${
                config.provider === 'openai' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🤖</span>
                <span className="font-bold">OpenAI (ChatGPT)</span>
                {config.provider === 'openai' && <FiCheck className="text-green-500 ml-auto" />}
              </div>
              <p className="text-xs text-gray-500">Pago • Alta qualidade</p>
            </button>
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Chave da API {config.provider === 'gemini' ? '(Google AI Studio)' : '(OpenAI)'}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => {
                setConfig({ ...config, apiKey: e.target.value })
                setHasUnsavedChanges(true)
              }}
              className="w-full px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={config.provider === 'gemini' ? 'AIza...' : 'sk-...'}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {config.provider === 'gemini' ? (
              <p>
                Obtenha sua chave gratuita em{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            ) : (
              <p>
                Obtenha sua chave em{' '}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Model (only for OpenAI) */}
        {config.provider === 'openai' && (
          <div>
            <label className="block text-sm font-medium mb-2">Modelo</label>
            <select
              value={config.model}
              onChange={(e) => {
                setConfig({ ...config, model: e.target.value })
                setHasUnsavedChanges(true)
              }}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais barato)</option>
              <option value="gpt-4o-mini">GPT-4o Mini (Equilibrado)</option>
              <option value="gpt-4o">GPT-4o (Melhor qualidade)</option>
            </select>
          </div>
        )}

        {/* Info box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <FiAlertCircle className="text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>O botão de IA aparecerá na edição de produtos</li>
                <li>Melhora, traduz ou gera descrições automaticamente</li>
                <li>O Gemini é gratuito com limite de requisições por minuto</li>
                <li>Suas chaves são armazenadas de forma segura</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !config.apiKey}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                Testando...
              </>
            ) : (
              <>
                <FiZap size={16} />
                Testar Conexão
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <FiSave size={16} />
                Salvar Configuração
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
