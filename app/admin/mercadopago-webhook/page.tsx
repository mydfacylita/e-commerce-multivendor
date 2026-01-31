'use client'

import { useState, useEffect } from 'react'
import { FiCheck, FiX, FiAlertCircle } from 'react-icons/fi'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function WebhookSetupPage() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // URL pública (cloudflare tunnel)
  const publicUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://stevens-indicator-obviously-carpet.trycloudflare.com'
  
  const webhookUrl = `${publicUrl}/api/webhooks/mercadopago`

  useEffect(() => {
    loadWebhooks()
  }, [])

  async function loadWebhooks() {
    try {
      const res = await fetch('/api/admin/mercadopago/webhook')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
      }
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function registerWebhook() {
    try {
      setRegistering(true)
      setMessage(null)

      const res = await fetch('/api/admin/mercadopago/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: 'Webhook registrado com sucesso!' })
        loadWebhooks()
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao registrar webhook' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setRegistering(false)
    }
  }

  const isRegistered = webhooks.some(w => w.url === webhookUrl && w.is_active)

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Configurar Webhook Mercado Pago</h1>

      {/* Status */}
      <div className={`p-4 rounded-lg border mb-6 ${isRegistered ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-3">
          {isRegistered ? (
            <>
              <FiCheck className="text-green-600 text-2xl" />
              <div>
                <p className="font-semibold text-green-900">Webhook Ativo</p>
                <p className="text-sm text-green-700">Pagamentos serão atualizados automaticamente</p>
              </div>
            </>
          ) : (
            <>
              <FiAlertCircle className="text-yellow-600 text-2xl" />
              <div>
                <p className="font-semibold text-yellow-900">Webhook Não Configurado</p>
                <p className="text-sm text-yellow-700">Configure para receber notificações automáticas</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`p-4 rounded-lg border mb-6 ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {message.text}
        </div>
      )}

      {/* URL do Webhook */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-3">URL do Webhook</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={webhookUrl}
            readOnly
            className="flex-1 px-4 py-2 border rounded bg-gray-50 font-mono text-sm"
          />
          <button
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Copiar
          </button>
        </div>
      </div>

      {/* Botão de Registro */}
      <button
        onClick={registerWebhook}
        disabled={registering || isRegistered}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {registering ? 'Registrando...' : isRegistered ? 'Já Registrado' : 'Registrar Webhook'}
      </button>

      {/* Lista de Webhooks */}
      {webhooks.length > 0 && (
        <div className="mt-8 bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold">Webhooks Registrados</h2>
          </div>
          <div className="divide-y">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-sm">{webhook.url}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {webhook.id} | Events: {webhook.events?.map((e: any) => e.topic).join(', ')}
                    </p>
                  </div>
                  {webhook.is_active ? (
                    <FiCheck className="text-green-600" />
                  ) : (
                    <FiX className="text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="text-gray-500">Carregando...</p>}
    </div>
  )
}
