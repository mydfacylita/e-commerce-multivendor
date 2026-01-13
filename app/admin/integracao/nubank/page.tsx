'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NubankConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    environment: 'production' as 'production' | 'sandbox'
  })
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/gateway/nubank')
      if (res.ok) {
        const data = await res.json()
        setConfig({
          clientId: data.config.clientId || '',
          clientSecret: data.config.clientSecret || '',
          environment: data.config.environment || 'production'
        })
        setIsActive(data.isActive)
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!config.clientId || !config.clientSecret) {
      alert('Preencha Client ID e Client Secret')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/gateway/nubank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          isActive
        })
      })

      if (res.ok) {
        alert('✅ Configuração salva com sucesso!')
        router.push('/admin/integracao')
      } else {
        const error = await res.json()
        alert(`❌ Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-purple-600 hover:text-purple-800 mb-4"
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-bold mb-2">Configurar Nubank PJ</h1>
        <p className="text-gray-600">Configure a integração com Nubank Business para enviar pagamentos via PIX</p>
      </div>

      {/* Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-purple-900 mb-2">🟣 Vantagens do Nubank PJ</h3>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>✅ Transferências PIX <strong>GRATUITAS</strong> ilimitadas</li>
          <li>✅ API REST moderna e segura</li>
          <li>✅ Pagamentos automáticos para vendedores</li>
          <li>✅ Consulta de saldo e extratos em tempo real</li>
        </ul>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-blue-900 mb-2">📋 Como obter as credenciais:</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal ml-5">
          <li>Acesse o <strong>Nubank Business</strong> pelo app ou web</li>
          <li>Vá em <strong>Configurações → Integrações → API</strong></li>
          <li>Clique em <strong>"Solicitar acesso à API"</strong></li>
          <li>Após aprovação, copie o <strong>Client ID</strong> e <strong>Client Secret</strong></li>
          <li>Cole as credenciais abaixo</li>
        </ol>
      </div>

      {/* Formulário */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Client ID *
            </label>
            <input
              type="text"
              value={config.clientId}
              onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="seu-client-id"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Client Secret *
            </label>
            <input
              type="password"
              value={config.clientSecret}
              onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="seu-client-secret"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Ambiente
            </label>
            <select
              value={config.environment}
              onChange={(e) => setConfig({ ...config, environment: e.target.value as any })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="production">Produção</option>
              <option value="sandbox">Sandbox (Testes)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="active" className="text-sm font-medium">
              Ativar integração
            </label>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
        <button
          onClick={() => router.back()}
          className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
