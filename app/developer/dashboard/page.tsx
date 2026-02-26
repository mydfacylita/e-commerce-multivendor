'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface App {
  id: string
  name: string
  description: string | null
  status: string
  apiKeys: { id: string; keyPrefix: string; name: string | null; isActive: boolean; requestCount: number }[]
  webhooks: { id: string }[]
  _count: { apiLogs: number }
  createdAt: string
}

export default function DeveloperDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [migrationPending, setMigrationPending] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/developer/login')
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/developer/apps')
        .then(r => {
          if (!r.ok && r.status !== 200) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then(data => {
          if (data._migrationPending) setMigrationPending(true)
          // Normaliza campos JSON que podem vir como string do MySQL
          const parsed = (data.data || []).map((app: any) => ({
            ...app,
            apiKeys: (app.apiKeys || []).map((k: any) => ({
              ...k,
              scopes: typeof k.scopes === 'string' ? JSON.parse(k.scopes) : (k.scopes || [])
            })),
            webhooks: app.webhooks || []
          }))
          setApps(parsed); setLoading(false)
        })
        .catch(err => { console.error('Erro ao carregar apps:', err); setLoading(false) })
    }
  }, [status])

  async function createApp() {
    if (!newAppName.trim()) return
    setCreating(true)
    const res = await fetch('/api/developer/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newAppName.trim() })
    })
    const data = await res.json()
    if (data.data) {
      setApps(prev => [data.data, ...prev])
      setNewAppName('')
      setShowModal(false)
      router.push(`/developer/apps/${data.data.id}`)
    }
    setCreating(false)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">M</div>
          <span className="font-semibold">MydShop <span className="text-blue-400">Developers</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/developer/docs" className="text-gray-400 hover:text-white text-sm">Docs</Link>
          <a href="/admin" className="text-gray-400 hover:text-white text-sm">Painel admin</a>
          <span className="text-gray-600 text-sm">{session?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Banner: migration pendente */}
        {migrationPending && (
          <div className="bg-yellow-950 border border-yellow-700 text-yellow-400 rounded-xl px-5 py-4 mb-6 text-sm">
            ⚠️ <strong>Migration pendente:</strong> As tabelas do portal ainda não foram criadas no banco de dados.
            Execute o script <code className="bg-yellow-900 px-1.5 py-0.5 rounded text-xs">add-developer-portal.sql</code> no servidor para ativar o portal.
          </div>
        )}

        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Meus Apps</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie suas integrações com a API MydShop</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span> Novo App
          </button>
        </div>

        {/* Apps list */}
        {apps.length === 0 ? (
          <div className="border border-dashed border-gray-700 rounded-xl p-16 text-center">
            <div className="text-4xl mb-4">🔌</div>
            <h2 className="text-lg font-semibold mb-2">Nenhum app criado</h2>
            <p className="text-gray-500 mb-6">Crie seu primeiro app para obter as credenciais de API</p>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
              Criar primeiro app
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map(app => (
              <Link key={app.id} href={`/developer/apps/${app.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">{app.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.status === 'ACTIVE' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                        {app.status === 'ACTIVE' ? 'Ativo' : app.status}
                      </span>
                    </div>
                    {app.description && <p className="text-gray-500 text-sm">{app.description}</p>}
                  </div>
                  <span className="text-gray-600 text-sm">→</span>
                </div>
                <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                  <span>🔑 {app.apiKeys.filter(k => k.isActive).length} chave(s) ativa(s)</span>
                  <span>📡 {app.webhooks.length} webhook(s)</span>
                  <span>📊 {app.apiKeys.reduce((acc, k) => acc + k.requestCount, 0).toLocaleString()} requests</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal novo app */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Criar novo app</h2>
            <input
              type="text"
              value={newAppName}
              onChange={e => setNewAppName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createApp()}
              placeholder="Nome do app (ex: Integração ERP)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setNewAppName('') }} className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={createApp} disabled={creating || !newAppName.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors">
                {creating ? 'Criando...' : 'Criar app'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
