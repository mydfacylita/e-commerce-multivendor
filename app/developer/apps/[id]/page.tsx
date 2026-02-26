'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SCOPES, type Scope } from '@/lib/dev-auth'

const ALL_SCOPES = Object.keys(SCOPES) as Scope[]

interface ApiKey {
  id: string; keyPrefix: string; name: string | null
  isActive: boolean; requestCount: number; scopes: string[]; lastUsedAt: string | null; createdAt: string
}
interface AppData {
  id: string; name: string; description: string | null; status: string
  apiKeys: ApiKey[]; webhooks: { id: string; url: string; events: string[]; isActive: boolean }[]
}

export default function DeveloperAppPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [app, setApp] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKeyData, setNewKeyData] = useState<any>(null)
  const [keyName, setKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<Set<Scope>>(new Set())
  const [generatingKey, setGeneratingKey] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/developer/login')
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/developer/apps')
        .then(r => r.json())
        .then(data => {
          // Normaliza campos JSON que podem vir como string do MySQL
          const allApps = (data.data || []).map((a: any) => ({
            ...a,
            apiKeys: (a.apiKeys || []).map((k: any) => ({
              ...k,
              scopes: typeof k.scopes === 'string' ? JSON.parse(k.scopes) : (k.scopes || [])
            })),
            webhooks: (a.webhooks || []).map((w: any) => ({
              ...w,
              events: typeof w.events === 'string' ? JSON.parse(w.events) : (w.events || [])
            }))
          }))
          const found = allApps.find((a: any) => a.id === params.id)
          if (!found) router.push('/developer/dashboard')
          else setApp(found)
          setLoading(false)
        })
    }
  }, [status])

  function toggleScope(s: Scope) {
    setSelectedScopes(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  async function generateKey() {
    if (!selectedScopes.size) return
    setGeneratingKey(true)
    const res = await fetch(`/api/developer/apps/${params.id}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: keyName, scopes: Array.from(selectedScopes) })
    })
    const data = await res.json()
    if (data.data) {
      setNewKeyData(data.data)
      // Atualiza lista de chaves
      setApp(prev => prev ? ({
        ...prev,
        apiKeys: [...prev.apiKeys, { ...data.data, requestCount: 0, lastUsedAt: null, createdAt: new Date().toISOString() }]
      }) : prev)
    }
    setGeneratingKey(false)
  }

  async function revokeKey(keyId: string) {    if (!confirm('Revogar esta chave? A ação não pode ser desfeita.')) return
    await fetch(`/api/developer/apps/${params.id}/keys`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId })
    })
    setApp(prev => prev ? ({ ...prev, apiKeys: prev.apiKeys.map(k => k.id === keyId ? { ...k, isActive: false } : k) }) : prev)
  }

  if (loading || !app) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">M</div>
          <span className="font-semibold">MydShop <span className="text-blue-400">Developers</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/developer/docs" className="text-gray-400 hover:text-white text-sm">Docs</Link>
          <a href="/admin" className="text-gray-400 hover:text-white text-sm">Painel admin</a>
          <Link href="/developer/dashboard" className="text-gray-400 hover:text-white text-sm">← Meus apps</Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* App info */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl">🔌</div>
          <div>
            <h1 className="text-2xl font-bold">{app.name}</h1>
            {app.description && <p className="text-gray-500 text-sm">{app.description}</p>}
          </div>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full ${app.status === 'ACTIVE' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
            {app.status === 'ACTIVE' ? 'Ativo' : app.status}
          </span>
        </div>

        {/* API Keys */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chaves de API</h2>
            <button onClick={() => { setShowKeyModal(true); setNewKeyData(null); setKeyName(''); setSelectedScopes(new Set()) }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + Nova chave
            </button>
          </div>

          {app.apiKeys.length === 0 ? (
            <div className="border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-500 text-sm">
              Nenhuma chave criada. Crie uma chave para começar a usar a API.
            </div>
          ) : (
            <div className="space-y-3">
              {app.apiKeys.map(key => (
                <div key={key.id} className={`bg-gray-900 border rounded-xl p-4 ${key.isActive ? 'border-gray-800' : 'border-gray-800 opacity-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <code className="text-blue-400 text-sm font-mono">{key.keyPrefix}</code>
                      {key.name && <span className="text-gray-400 text-sm">{key.name}</span>}
                      {!key.isActive && <span className="text-xs text-red-400 bg-red-950 px-2 py-0.5 rounded">Revogada</span>}
                    </div>
                    {key.isActive && (
                      <button onClick={() => revokeKey(key.id)} className="text-red-500 hover:text-red-400 text-xs">Revogar</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {key.scopes.map(s => <code key={s} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{s}</code>)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {key.requestCount.toLocaleString()} requests •
                    {key.lastUsedAt ? ` Último uso: ${new Date(key.lastUsedAt).toLocaleDateString('pt-BR')}` : ' Nunca usado'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Webhooks */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Webhooks</h2>
          {app.webhooks.length === 0 ? (
            <div className="border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-500 text-sm">
              Nenhum webhook. Use <code className="text-blue-400">POST /api/v1/webhooks</code> para registrar.
            </div>
          ) : (
            <div className="space-y-3">
              {app.webhooks.map(wh => (
                <div key={wh.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <code className="text-sm text-gray-300">{wh.url}</code>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {wh.events.map(e => <span key={e} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{e}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal criar chave */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            {newKeyData ? (
              <div>
                <h2 className="text-lg font-semibold text-green-400 mb-4">✅ Chave gerada! Salve agora.</h2>
                <p className="text-yellow-400 text-sm mb-4 bg-yellow-950 border border-yellow-800 rounded-lg p-3">
                  ⚠️ Esta é a única vez que você verá a api_key e api_secret. Guarde em local seguro.
                </p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">API Key</label>
                    <code className="block w-full bg-gray-800 rounded-lg p-3 text-sm text-blue-400 break-all">{newKeyData.api_key}</code>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">API Secret</label>
                    <code className="block w-full bg-gray-800 rounded-lg p-3 text-sm text-orange-400 break-all">{newKeyData.api_secret}</code>
                  </div>
                </div>
                <button onClick={() => setShowKeyModal(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium">
                  Já salvei, fechar
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold mb-4">Nova chave de API</h2>
                <input type="text" value={keyName} onChange={e => setKeyName(e.target.value)}
                  placeholder="Nome da chave (ex: Produção, Testes)" autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4" />
                <p className="text-sm text-gray-400 mb-3">Selecione os scopes de acesso:</p>
                <div className="space-y-2 mb-6">
                  {ALL_SCOPES.map(s => (
                    <label key={s} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={selectedScopes.has(s)} onChange={() => toggleScope(s)}
                        className="w-4 h-4 rounded accent-blue-500" />
                      <code className="text-sm text-blue-400">{s}</code>
                      <span className="text-xs text-gray-500">{SCOPES[s]}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowKeyModal(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-lg">Cancelar</button>
                  <button onClick={generateKey} disabled={generatingKey || !selectedScopes.size}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                    {generatingKey ? 'Gerando...' : 'Gerar chave'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
