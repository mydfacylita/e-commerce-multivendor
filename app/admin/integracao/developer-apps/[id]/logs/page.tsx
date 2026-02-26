'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Log {
  id: string
  keyPrefix: string
  method: string
  path: string
  statusCode: number
  latencyMs: number
  ipAddress: string | null
  userAgent: string | null
  error: string | null
  createdAt: string
}

interface Stats {
  totalToday: number
  errorsToday: number
  errorRateToday: number
  avgLatencyMs: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PATCH: 'bg-orange-100 text-orange-700',
  PUT: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
}

function statusColor(code: number) {
  if (code < 300) return 'text-green-600 font-semibold'
  if (code < 400) return 'text-blue-600 font-semibold'
  if (code < 500) return 'text-orange-500 font-semibold'
  return 'text-red-600 font-semibold'
}

function latencyColor(ms: number) {
  if (ms < 200) return 'text-green-600'
  if (ms < 800) return 'text-orange-500'
  return 'text-red-600 font-semibold'
}

export default function DeveloperAppLogsPage() {
  const { id } = useParams<{ id: string }>()

  const [appName, setAppName] = useState('')
  const [logs, setLogs] = useState<Log[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')   // '' | 'ok' | 'error'
  const [filterMethod, setFilterMethod] = useState('')
  const [filterPath, setFilterPath]   = useState('')
  const [page, setPage] = useState(1)

  // Detail row
  const [expanded, setExpanded] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams({ page: String(page), limit: '50' })
    if (filterStatus) q.set('status', filterStatus)
    if (filterMethod) q.set('method', filterMethod)
    if (filterPath)   q.set('path', filterPath)

    const r = await fetch(`/api/admin/developer-apps/${id}/logs?${q}`)
    const d = await r.json()
    if (!r.ok) return setLoading(false)

    setAppName(d.app?.name || '')
    setLogs(d.logs || [])
    setStats(d.stats || null)
    setPagination(d.pagination || null)
    setLoading(false)
  }, [id, page, filterStatus, filterMethod, filterPath])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [autoRefresh, load])

  function applyFilters() { setPage(1); load() }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/integracao/developer-apps"
          className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1"
        >
          ← Apps
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          Logs da API {appName && <span className="text-primary-600">— {appName}</span>}
        </h1>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.totalToday.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Requisições (24h)</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`text-2xl font-bold ${stats.errorsToday > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.errorsToday.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Erros (24h)</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`text-2xl font-bold ${stats.errorRateToday > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.errorRateToday}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Taxa de erro (24h)</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`text-2xl font-bold ${latencyColor(stats.avgLatencyMs)}`}>
              {stats.avgLatencyMs}ms
            </div>
            <div className="text-xs text-gray-500 mt-1">Latência média (24h)</div>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="ok">✅ Sucesso (2xx/3xx)</option>
            <option value="error">❌ Erro (4xx/5xx)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Método</label>
          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {['GET','POST','PATCH','PUT','DELETE'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Endpoint</label>
          <input
            type="text"
            value={filterPath}
            onChange={e => setFilterPath(e.target.value)}
            placeholder="/api/v1/orders"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48"
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <button
          onClick={applyFilters}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
        >
          Filtrar
        </button>
        <button
          onClick={() => { setFilterStatus(''); setFilterMethod(''); setFilterPath(''); setPage(1) }}
          className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg text-sm"
        >
          Limpar
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-gray-500 flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="accent-primary-600"
            />
            Auto-refresh 5s
          </label>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 text-lg leading-none" title="Atualizar">↻</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {pagination ? `${pagination.total.toLocaleString()} registro${pagination.total !== 1 ? 's' : ''}` : '—'}
          </span>
          {loading && <span className="text-xs text-gray-400">Carregando…</span>}
        </div>

        {logs.length === 0 && !loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <div className="text-4xl mb-3">📭</div>
            Nenhum log encontrado para os filtros selecionados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Horário</th>
                  <th className="text-left px-4 py-3 font-semibold">Método</th>
                  <th className="text-left px-4 py-3 font-semibold">Endpoint</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Latência</th>
                  <th className="text-left px-4 py-3 font-semibold">Chave</th>
                  <th className="text-left px-4 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpanded(e => e === log.id ? null : log.id)}
                      className={`border-t border-gray-50 cursor-pointer transition-colors
                        ${expanded === log.id ? 'bg-blue-50' : 'hover:bg-gray-50'}
                        ${log.statusCode >= 400 ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap font-mono text-xs">
                        {new Date(log.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${METHOD_COLORS[log.method] || 'bg-gray-100 text-gray-600'}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700 max-w-xs truncate">
                        {log.path}
                      </td>
                      <td className={`px-4 py-2.5 ${statusColor(log.statusCode)}`}>
                        {log.statusCode}
                      </td>
                      <td className={`px-4 py-2.5 font-mono text-xs ${latencyColor(log.latencyMs)}`}>
                        {log.latencyMs}ms
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                        {log.keyPrefix}…
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr key={log.id + '-detail'} className="bg-blue-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-semibold text-gray-600 mb-1">User Agent</div>
                              <div className="font-mono text-gray-500 break-all">{log.userAgent || '—'}</div>
                            </div>
                            {log.error && (
                              <div>
                                <div className="font-semibold text-red-600 mb-1">Erro</div>
                                <div className="font-mono text-red-700 bg-red-50 border border-red-200 rounded p-2 break-all">{log.error}</div>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-600 mb-1">ID do log</div>
                              <div className="font-mono text-gray-400">{log.id}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">
            Página {pagination.page} de {pagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
