'use client'
import { useEffect, useState } from 'react'

const ALL_SCOPES = ['orders:read', 'orders:write', 'products:read', 'products:write']
const SCOPE_LABELS: Record<string, string> = {
  'orders:read':    'Ver pedidos',
  'orders:write':   'Gerenciar pedidos',
  'products:read':  'Ver produtos',
  'products:write': 'Gerenciar produtos',
}
const APP_TYPES = ['SHOPIFY', 'AMAZON', 'MERCADOLIVRE', 'WOOCOMMERCE', 'CUSTOM']

interface OAuthApp {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  clientId: string
  clientSecret?: string
  redirectUris: string
  scopes: string
  appType: string
  status: string
  createdAt: string
  _count: { connections: number; authCodes: number }
}

export default function AdminOAuthAppsPage() {
  const [apps, setApps]             = useState<OAuthApp[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<OAuthApp | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newSecret, setNewSecret]   = useState<string | null>(null) // Exibir só na criação

  // Form criar
  const [form, setForm]   = useState({ name: '', description: '', logoUrl: '', redirectUris: '', appType: 'CUSTOM', scopes: new Set<string>() })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch('/api/admin/oauth-apps')
      .then(r => r.json())
      .then(d => { setApps(d.data || []); setLoading(false) })
  }, [])

  async function createApp() {
    if (!form.name || !form.redirectUris || form.scopes.size === 0) {
      setError('Preencha nome, redirect URIs e selecione pelo menos 1 scope.')
      return
    }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/oauth-apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        logoUrl: form.logoUrl || null,
        redirectUris: form.redirectUris.split('\n').map(u => u.trim()).filter(Boolean),
        scopes: Array.from(form.scopes),
        appType: form.appType,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro ao criar'); setSaving(false); return }
    setNewSecret(data.data.clientSecret)
    setApps(prev => [data.data, ...prev])
    setShowCreate(false)
    setForm({ name: '', description: '', logoUrl: '', redirectUris: '', appType: 'CUSTOM', scopes: new Set() })
    setSaving(false)
  }

  async function toggleStatus(app: OAuthApp) {
    const newStatus = app.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    if (!confirm(`${newStatus === 'SUSPENDED' ? 'Suspender' : 'Reativar'} o app "${app.name}"?`)) return
    await fetch(`/api/admin/oauth-apps/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a))
    if (selected?.id === app.id) setSelected(prev => prev ? { ...prev, status: newStatus } : prev)
  }

  async function deleteApp(app: OAuthApp) {
    if (!confirm(`Excluir o app "${app.name}"? Todas as conexões serão revogadas.`)) return
    await fetch(`/api/admin/oauth-apps/${app.id}`, { method: 'DELETE' })
    setApps(prev => prev.filter(a => a.id !== app.id))
    if (selected?.id === app.id) setSelected(null)
  }

  if (loading) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* Lista */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">OAuth Apps</h2>
            <p className="text-xs text-gray-400">{apps.length} app(s) cadastrado(s)</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setNewSecret(null); setError('') }}
            className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >+ Novo App</button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {apps.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhum OAuth App cadastrado.<br/>Crie o primeiro para começar.</div>
          )}
          {apps.map(app => (
            <button
              key={app.id}
              onClick={() => setSelected(app)}
              className={`w-full text-left p-4 hover:bg-gray-50 transition ${selected?.id === app.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
            >
              <div className="flex items-center gap-3">
                {app.logoUrl ? (
                  <img src={app.logoUrl} alt="" className="w-9 h-9 rounded-lg object-contain border bg-white p-0.5" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {app.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800 truncate">{app.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${app.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {app.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{app.appType} · {app._count.connections} conexões</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detalhe */}
      <div className="flex-1 p-8 overflow-y-auto">
        {newSecret && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 max-w-2xl">
            <p className="font-bold text-yellow-800 mb-1">⚠️ Guarde o Client Secret agora!</p>
            <p className="text-xs text-yellow-700 mb-2">Ele não será exibido novamente por segurança.</p>
            <code className="block bg-yellow-100 rounded p-2 text-xs font-mono break-all select-all">{newSecret}</code>
            <button onClick={() => setNewSecret(null)} className="text-xs text-yellow-600 mt-2 hover:underline">Fechar</button>
          </div>
        )}

        {showCreate ? (
          <div className="max-w-2xl bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-6">Novo OAuth App</h3>
            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do App *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ex: Shopify Integration" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.appType} onChange={e => setForm(f => ({ ...f, appType: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  {APP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (opcional)</label>
                <input type="url" value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URIs *</label>
                <textarea value={form.redirectUris} onChange={e => setForm(f => ({ ...f, redirectUris: e.target.value }))}
                  rows={3} placeholder="Uma URI por linha&#10;https://app.exemplo.com/callback&#10;https://staging.exemplo.com/callback"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono" />
                <p className="text-xs text-gray-400 mt-1">Uma URI por linha. Apenas URIs HTTPS em produção.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissões (Scopes) *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SCOPES.map(s => (
                    <label key={s} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${form.scopes.has(s) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={form.scopes.has(s)}
                        onChange={() => setForm(f => {
                          const next = new Set(f.scopes)
                          next.has(s) ? next.delete(s) : next.add(s)
                          return { ...f, scopes: next }
                        })} className="accent-blue-600" />
                      <span className="text-sm text-gray-700">{SCOPE_LABELS[s]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={createApp} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar App'}
              </button>
            </div>
          </div>
        ) : selected ? (
          <div className="max-w-2xl space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex items-start gap-4">
                {selected.logoUrl ? (
                  <img src={selected.logoUrl} alt="" className="w-14 h-14 rounded-xl object-contain border bg-white p-1" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                    {selected.name[0]}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-gray-800 text-xl">{selected.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selected.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {selected.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{selected.appType}</p>
                  {selected.description && <p className="text-sm text-gray-600 mt-1">{selected.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleStatus(selected)}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${selected.status === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                    {selected.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                  </button>
                  <button onClick={() => deleteApp(selected)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Excluir</button>
                </div>
              </div>
            </div>

            {/* Credenciais */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Credenciais OAuth</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Client ID</label>
                  <div className="mt-1 bg-gray-50 rounded-lg p-3 font-mono text-sm select-all break-all">{selected.clientId}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Client Secret</label>
                  <div className="mt-1 bg-gray-100 rounded-lg p-3 text-xs text-gray-400 italic">Oculto por segurança. Gerado apenas na criação.</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Redirect URIs</label>
                  <div className="mt-1 bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-1">
                    {(JSON.parse(selected.redirectUris) as string[]).map(uri => (
                      <div key={uri} className="text-gray-700">{uri}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Scopes */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Permissões concedidas</h3>
              <div className="flex flex-wrap gap-2">
                {(JSON.parse(selected.scopes) as string[]).map(s => (
                  <span key={s} className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>

            {/* Endpoints */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Endpoints para integração</h3>
              <div className="space-y-2 text-xs font-mono">
                {[
                  ['Autorização', 'GET', '/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={URI}&response_type=code&scope={SCOPES}&state={STATE}'],
                  ['Trocar code por token', 'POST', '/api/oauth/token'],
                  ['Renovar token', 'POST', '/api/oauth/token (grant_type=refresh_token)'],
                  ['Dados do vendedor', 'GET', '/api/oauth/me'],
                  ['Revogar acesso', 'POST', '/api/oauth/revoke'],
                  ['Pedidos do vendedor', 'GET', '/api/v1/orders (via OAuth Bearer token)'],
                ].map(([desc, method, path]) => (
                  <div key={path} className="bg-gray-50 rounded-lg p-2.5 flex items-start gap-2">
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold ${method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{method}</span>
                    <div>
                      <div className="text-gray-400 text-[10px] mb-0.5">{desc}</div>
                      <div className="text-gray-700 break-all">{path}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border p-5 text-center">
                <div className="text-3xl font-bold text-blue-600">{selected._count.connections}</div>
                <div className="text-xs text-gray-500 mt-1">Vendedores conectados</div>
              </div>
              <div className="bg-white rounded-2xl border p-5 text-center">
                <div className="text-3xl font-bold text-gray-400">{selected._count.authCodes}</div>
                <div className="text-xs text-gray-500 mt-1">Autorizações emitidas</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            ← Selecione um app ou crie um novo
          </div>
        )}
      </div>
    </div>
  )
}
