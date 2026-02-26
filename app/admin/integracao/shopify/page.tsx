
'use client'

import { useEffect, useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConfigField {
  key:         string
  label:       string
  description: string
  type:        string
  value:       string
  configured:  boolean
}

interface ShopifyInstallation {
  id:                  string
  shopDomain:          string
  shopName:            string | null
  shopEmail:           string | null
  shopPlan:            string | null
  shopCurrency:        string | null
  isActive:            boolean
  installedAt:         string
  lastSyncAt:          string | null
  syncOrdersEnabled:   boolean
  syncProductsEnabled: boolean
  _count?: { orderSyncs: number; productSyncs: number }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ShopifyAdminPage() {
  const [tab, setTab] = useState<'config' | 'lojas'>('config')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#96bf48] rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integração Shopify</h1>
          <p className="text-gray-500 text-sm">App Mydshop na Shopify App Store</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { id: 'config' as const, label: '⚙️ Credenciais do App' },
          { id: 'lojas'  as const, label: '🛍 Lojas Conectadas'  },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? 'bg-white border border-b-white border-gray-200 -mb-px text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' ? <ConfigTab /> : <LojasTab />}
    </div>
  )
}

// ─── Tab: Credenciais ─────────────────────────────────────────────────────────

function ConfigTab() {
  const [config,  setConfig]  = useState<Record<string, ConfigField>>({})
  const [form,    setForm]    = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/shopify/config')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        const initial: Record<string, string> = {}
        for (const key of Object.keys(data)) {
          initial[key] = data[key].type === 'password' ? '' : (data[key].value || '')
        }
        setForm(initial)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/shopify/config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: `✅ ${data.message}` })
        const fresh = await fetch('/api/admin/shopify/config').then(r => r.json())
        setConfig(fresh)
        setForm(prev => ({ ...prev, 'shopify.apiSecret': '' }))
      } else {
        setMessage({ type: 'error', text: `❌ ${data.error}` })
      }
    } finally {
      setSaving(false)
    }
  }

  const defaultScopes = 'read_orders,write_orders,read_products,write_products,read_customers'

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-1">Como obter as credenciais</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Acesse <a href="https://partners.shopify.com" target="_blank" rel="noopener" className="underline font-medium">partners.shopify.com</a></li>
          <li>Vá em <b>Apps → MydShop → Configurações</b></li>
          <li>Copie o <b>Client ID</b> (API Key) e o <b>Client secret</b> (API Secret)</li>
          <li>Cole nos campos abaixo e clique em Salvar</li>
        </ol>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Credenciais Shopify Partners</h2>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key (Client ID)
            {config['shopify.apiKey']?.configured && (
              <span className="ml-2 text-xs text-green-600 font-semibold">✓ configurado</span>
            )}
          </label>
          <input
            type="text"
            value={form['shopify.apiKey'] || ''}
            onChange={e => setForm(p => ({ ...p, 'shopify.apiKey': e.target.value }))}
            placeholder="ex: shppa_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Chave pública — aparece para o lojista durante a instalação</p>
        </div>

        {/* API Secret */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Secret (Client Secret)
            {config['shopify.apiSecret']?.configured && (
              <span className="ml-2 text-xs text-green-600 font-semibold">✓ configurado</span>
            )}
          </label>
          <input
            type="password"
            value={form['shopify.apiSecret'] || ''}
            onChange={e => setForm(p => ({ ...p, 'shopify.apiSecret': e.target.value }))}
            placeholder={config['shopify.apiSecret']?.configured ? '(deixe em branco para manter o atual)' : 'Cole o Client Secret aqui'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Nunca exposto publicamente — usado para validar HMAC e trocar tokens</p>
        </div>

        {/* Scopes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Escopos OAuth</label>
          <input
            type="text"
            value={form['shopify.scopes'] || defaultScopes}
            onChange={e => setForm(p => ({ ...p, 'shopify.scopes': e.target.value }))}
            placeholder={defaultScopes}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Deve ser idêntico ao configurado no Shopify Partners. Separar por vírgula.
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {defaultScopes.split(',').map(s => (
              <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* URLs de callback para o Shopify Partners */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 mb-3">URLs para configurar no Shopify Partners</h3>
        <div className="space-y-2">
          {[
            { label: 'URL de redirecionamento OAuth',             url: '/api/shopify/callback'                          },
            { label: 'Webhook GDPR — customers/redact',           url: '/api/shopify/webhooks/customers/redact'          },
            { label: 'Webhook GDPR — shop/redact',                url: '/api/shopify/webhooks/shop/redact'               },
            { label: 'Webhook GDPR — customers/data_request',     url: '/api/shopify/webhooks/customers/data_request'    },
          ].map(item => (
            <div key={item.url} className="flex items-start gap-3">
              <span className="text-xs text-gray-500 w-60 pt-1 flex-shrink-0">{item.label}</span>
              <code className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-blue-700 flex-1 break-all">
                https://mydshop.com.br{item.url}
              </code>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? 'Salvando...' : '💾 Salvar Credenciais'}
      </button>
    </div>
  )
}

// ─── Tab: Lojas Conectadas ────────────────────────────────────────────────────

function LojasTab() {
  const [installations, setInstallations] = useState<ShopifyInstallation[]>([])
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState<string | null>(null)
  const [message,  setMessage]  = useState('')

  useEffect(() => { fetchInstallations() }, [])

  async function fetchInstallations() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/shopify/installations')
      if (res.ok) setInstallations(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function syncOrders(shop: string) {
    setSyncing(shop + '_orders')
    try {
      const res  = await fetch('/api/shopify/sync/orders',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shop }) })
      const data = await res.json()
      setMessage(`${shop}: ${data.imported ?? 0} importados, ${data.skipped ?? 0} ignorados, ${data.failed ?? 0} falhas`)
    } finally { setSyncing(null) }
  }

  async function syncProducts(shop: string) {
    setSyncing(shop + '_products')
    try {
      const res  = await fetch('/api/shopify/sync/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shop }) })
      const data = await res.json()
      setMessage(`${shop}: ${data.synced ?? 0} criados, ${data.updated ?? 0} atualizados, ${data.failed ?? 0} falhas`)
    } finally { setSyncing(null) }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/shopify/installations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ isActive: !current }),
    })
    fetchInstallations()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-blue-600">✕</button>
        </div>
      )}

      {installations.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">🛍</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Nenhuma loja conectada ainda</h3>
          <p className="text-gray-500 text-sm mb-4">
            Quando um lojista instalar o app Mydshop pela Shopify App Store, aparecerá aqui.
          </p>
          <code className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600">
            /api/shopify/install?shop=loja.myshopify.com
          </code>
        </div>
      ) : (
        installations.map(inst => (
          <div key={inst.id} className={`bg-white border rounded-xl p-5 ${inst.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{inst.shopName || inst.shopDomain}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${inst.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {inst.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{inst.shopDomain}</p>
                {inst.shopEmail && <p className="text-xs text-gray-400">{inst.shopEmail}</p>}
              </div>
              <div className="text-right text-xs text-gray-400">
                <div>Instalado {new Date(inst.installedAt).toLocaleDateString('pt-BR')}</div>
                {inst.lastSyncAt && <div>Sync: {new Date(inst.lastSyncAt).toLocaleString('pt-BR')}</div>}
                <div className="font-medium text-gray-600 mt-1">
                  {inst._count?.orderSyncs || 0} pedidos · {inst._count?.productSyncs || 0} produtos
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => syncOrders(inst.shopDomain)}   disabled={!!syncing || !inst.isActive} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
                {syncing === inst.shopDomain + '_orders'   ? 'Importando...' : '📦 Importar Pedidos'}
              </button>
              <button onClick={() => syncProducts(inst.shopDomain)} disabled={!!syncing || !inst.isActive} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50">
                {syncing === inst.shopDomain + '_products' ? 'Enviando...'   : '🛍 Enviar Produtos'}
              </button>
              <button onClick={() => toggleActive(inst.id, inst.isActive)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${inst.isActive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {inst.isActive ? '⏸ Desativar' : '▶ Reativar'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
              {inst.shopPlan     && <span>Plano: <b>{inst.shopPlan}</b></span>}
              {inst.shopCurrency && <span>Moeda: <b>{inst.shopCurrency}</b></span>}
              <span>Pedidos: <b>{inst.syncOrdersEnabled   ? 'ativo' : 'pausado'}</b></span>
              <span>Produtos: <b>{inst.syncProductsEnabled ? 'ativo' : 'pausado'}</b></span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
