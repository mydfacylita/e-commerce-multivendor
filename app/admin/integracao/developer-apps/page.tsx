'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Apenas valores válidos do enum OrderStatus do Prisma
const ALL_STATUSES = ['PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED']

interface DevApp {
  id: string
  name: string
  description: string | null
  status: string
  filterConfig: any
  createdAt: string
  owner: { id: string; name: string | null; email: string | null }
  apiKeys: { id: string; name: string | null; isActive: boolean; requestCount: number; lastUsedAt: string | null; scopes: any }[]
  _count: { apiLogs: number }
}

export default function AdminDeveloperAppsPage() {
  const [apps, setApps] = useState<DevApp[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationPending, setMigrationPending] = useState(false)
  const [selected, setSelected] = useState<DevApp | null>(null)
  const [branches, setBranches] = useState<{ code: string; name: string }[]>([])

  // filterConfig edit state
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [filterSeller, setFilterSeller] = useState('')
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/developer-apps')
      .then(r => r.json())
      .then(d => {
        if (d._migrationPending) setMigrationPending(true)
        setApps(d.data || [])
        setLoading(false)
      })
    fetch('/api/admin/company-branches')
      .then(r => r.ok ? r.json() : [])
      .then(d => setBranches(Array.isArray(d) ? d.filter((b: any) => b.isActive) : []))
  }, [])

  function openApp(app: DevApp) {
    setSelected(app)
    setSaved(false)
    const raw = typeof app.filterConfig === 'string' ? JSON.parse(app.filterConfig || 'null') : app.filterConfig
    const fc = raw?.orders || {}
    setFilterWarehouse(fc.warehouseCode || '')
    setFilterSeller(fc.sellerId || '')
    setFilterStatuses(new Set(fc.statuses || []))
  }

  function toggleStatus(s: string) {
    setFilterStatuses(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  async function saveRestrictions() {
    if (!selected) return
    setSaving(true)
    const filterConfig = {
      orders: {
        ...(filterWarehouse.trim() && { warehouseCode: filterWarehouse.trim() }),
        ...(filterSeller.trim() && { sellerId: filterSeller.trim() }),
        ...(filterStatuses.size && { statuses: Array.from(filterStatuses) })
      }
    }
    const res = await fetch(`/api/admin/developer-apps/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterConfig })
    })
    if (res.ok) {
      setSaved(true)
      setApps(prev => prev.map(a => a.id === selected.id ? { ...a, filterConfig } : a))
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function toggleAppStatus(app: DevApp) {
    const newStatus = app.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    if (!confirm(`${newStatus === 'SUSPENDED' ? 'Suspender' : 'Reativar'} o app "${app.name}"?`)) return
    const res = await fetch(`/api/admin/developer-apps/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) {
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a))
      if (selected?.id === app.id) setSelected(s => s ? { ...s, status: newStatus } : null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Apps de Desenvolvedores</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gerencie apps externos que utilizam a API. Configure restrições de acesso por galpão, seller e status de pedidos.
        </p>
      </div>

      {migrationPending && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          ⚠️ Tabelas do portal de desenvolvedores ainda não foram criadas. Execute <code className="font-mono bg-yellow-100 px-1 rounded">add-developer-portal.sql</code> no banco.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Lista de apps */}
        <div className="lg:col-span-2 space-y-3">
          {apps.length === 0 && !migrationPending && (
            <div className="text-center py-12 text-gray-400 text-sm border border-dashed rounded-xl">
              Nenhum app criado ainda.
            </div>
          )}
          {apps.map(app => {
            const fc = (typeof app.filterConfig === 'string' ? JSON.parse(app.filterConfig || 'null') : app.filterConfig)?.orders || {}
            const hasFilter = fc.warehouseCode || fc.sellerId || fc.statuses?.length
            const isReleased = app.filterConfig !== null
            const activeKeys = app.apiKeys.filter(k => k.isActive).length
            return (
              <div
                key={app.id}
                onClick={() => openApp(app)}
                className={`cursor-pointer border rounded-xl p-4 transition-all
                  ${selected?.id === app.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 text-sm">{app.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${app.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {app.status === 'ACTIVE' ? 'Ativo' : app.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{app.owner.email}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>🔑 {activeKeys} chave{activeKeys !== 1 ? 's' : ''}</span>
                  <span>📊 {app._count.apiLogs.toLocaleString()} req</span>
                  {!isReleased
                    ? <span className="text-red-500 font-medium">🔴 Bloqueado</span>
                    : hasFilter
                    ? <span className="text-orange-600 font-medium">🔒 Restrito</span>
                    : <span className="text-green-600 font-medium">🟢 Liberado</span>
                  }
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <Link
                    href={`/admin/integracao/developer-apps/${app.id}/logs`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    📋 Ver Logs
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Painel de detalhes / edição */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm border border-dashed rounded-xl">
              Selecione um app para configurar
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              {/* Status de acesso atual */}
              {(() => {
                const raw = typeof selected.filterConfig === 'string' ? JSON.parse(selected.filterConfig || 'null') : selected.filterConfig
                const isReleased = raw !== null
                return (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-5 text-sm border
                    ${isReleased ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <span className="text-lg">{isReleased ? '🟢' : '🔴'}</span>
                    <div className="flex-1">
                      {isReleased
                        ? 'App liberado — o desenvolvedor consegue acessar a API.'
                        : 'App bloqueado — nenhuma requisição de pedidos é permitida até o admin liberar.'}
                    </div>
                    {!isReleased && (
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/admin/developer-apps/${selected.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filterConfig: {} })
                          })
                          if (res.ok) {
                            setApps(prev => prev.map(a => a.id === selected.id ? { ...a, filterConfig: {} } : a))
                            setSelected(s => s ? { ...s, filterConfig: {} } : null)
                          }
                        }}
                        className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                      >
                        Liberar agora
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Cabeçalho */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  {selected.description && <p className="text-sm text-gray-500">{selected.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">Dono: {selected.owner.name || selected.owner.email}</p>
                </div>
                <button
                  onClick={() => toggleAppStatus(selected)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                    ${selected.status === 'ACTIVE'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}`}
                >
                  {selected.status === 'ACTIVE' ? 'Suspender app' : 'Reativar app'}
                </button>
              </div>

              {/* Chaves ativas */}
              {selected.apiKeys.filter(k => k.isActive).length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Chaves ativas</h3>
                  <div className="space-y-2">
                    {selected.apiKeys.filter(k => k.isActive).map(k => {
                      const scopes = typeof k.scopes === 'string' ? JSON.parse(k.scopes) : (k.scopes || [])
                      return (
                        <div key={k.id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">{k.name || 'Sem nome'}</span>
                            <span className="text-gray-400">{k.requestCount.toLocaleString()} req</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {scopes.map((s: string) => (
                              <code key={s} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">{s}</code>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <hr className="border-gray-100 mb-5" />

              {/* Restrições de acesso */}
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Restrições de Acesso</h3>
              <p className="text-xs text-gray-400 mb-4">
                Define quais pedidos este app pode visualizar via API. Deixe em branco para acesso irrestrito.
              </p>

              <div className="space-y-4">
                {/* Galpão */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Galpão / Filial (warehouseCode)</label>
                  <select
                    value={filterWarehouse}
                    onChange={e => setFilterWarehouse(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white"
                  >
                    <option value="">— Sem restrição (todos os galpões) —</option>
                    {branches.map(b => (
                      <option key={b.code} value={b.code}>{b.code} — {b.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">O app verá apenas pedidos cujo <code className="bg-gray-100 px-1 rounded">warehouseCode</code> corresponda à filial selecionada.</p>
                  {branches.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">⚠ Nenhuma filial cadastrada. <a href="/admin/empresa/filiais" className="underline">Cadastrar filiais</a></p>
                  )}
                </div>

                {/* Seller */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seller ID (opcional)</label>
                  <input
                    type="text"
                    value={filterSeller}
                    onChange={e => setFilterSeller(e.target.value)}
                    placeholder="ID do seller (deixe vazio para qualquer seller)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status de pedidos visíveis</label>
                  <p className="text-xs text-gray-400 mb-2">Sem seleção = nenhum pedido visível. Selecione ao menos um status.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_STATUSES.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filterStatuses.has(s)}
                          onChange={() => toggleStatus(s)}
                          className="w-4 h-4 rounded accent-primary-500"
                        />
                        <code className="text-xs text-gray-600 group-hover:text-gray-900">{s}</code>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {saved
                    ? <span className="text-green-600 text-sm font-medium">✓ Restrições salvas!</span>
                    : <span className="text-xs text-gray-400">
                        {filterWarehouse || filterSeller || filterStatuses.size
                          ? '🔒 App terá acesso restrito'
                          : '🔓 App tem acesso irrestrito'}
                      </span>
                  }
                  <button
                    onClick={saveRestrictions}
                    disabled={saving}
                    className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {saving ? 'Salvando...' : 'Salvar restrições'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
