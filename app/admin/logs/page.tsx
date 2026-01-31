'use client'

import { useState, useEffect } from 'react'
import { FiRefreshCw, FiTrash2, FiSearch, FiFilter } from 'react-icons/fi'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface ApiLog {
  id: string
  method: string
  endpoint: string
  statusCode: number
  userId?: string
  userRole?: string
  sellerId?: string
  sellerName?: string
  errorMessage?: string
  duration?: number
  createdAt: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [filters, setFilters] = useState({
    method: '',
    statusCode: '',
    endpoint: '',
    sellerId: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      })

      const res = await fetch(`/api/admin/logs?${params}`)
      const data = await res.json()

      if (res.ok) {
        setLogs(data.logs)
        setTotal(data.pagination.total)
        setPages(data.pagination.pages)
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
      alert('Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, filters])

  const handleClearOldLogs = async () => {
    if (!confirm('Deseja excluir logs com mais de 30 dias?')) return

    try {
      const res = await fetch('/api/admin/logs?days=30', {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message)
        loadLogs()
      } else {
        alert(data.message || 'Erro ao excluir logs')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao excluir logs')
    }
  }

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600 bg-green-50'
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600 bg-yellow-50'
    if (statusCode >= 500) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'text-blue-600 bg-blue-50'
      case 'POST':
        return 'text-green-600 bg-green-50'
      case 'PUT':
      case 'PATCH':
        return 'text-yellow-600 bg-yellow-50'
      case 'DELETE':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs de API</h1>
          <p className="text-gray-600 mt-1">
            {total} registros encontrados
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <FiFilter />
            Filtros
          </button>
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FiRefreshCw />
            Atualizar
          </button>
          <button
            onClick={handleClearOldLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <FiTrash2 />
            Limpar Antigos
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método
              </label>
              <select
                value={filters.method}
                onChange={(e) => {
                  setFilters({ ...filters, method: e.target.value })
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Code
              </label>
              <select
                value={filters.statusCode}
                onChange={(e) => {
                  setFilters({ ...filters, statusCode: e.target.value })
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos</option>
                <option value="200">200 (OK)</option>
                <option value="201">201 (Created)</option>
                <option value="400">400 (Bad Request)</option>
                <option value="403">403 (Forbidden)</option>
                <option value="404">404 (Not Found)</option>
                <option value="500">500 (Server Error)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint
              </label>
              <input
                type="text"
                value={filters.endpoint}
                onChange={(e) => {
                  setFilters({ ...filters, endpoint: e.target.value })
                  setPage(1)
                }}
                placeholder="/api/admin/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seller ID
              </label>
              <input
                type="text"
                value={filters.sellerId}
                onChange={(e) => {
                  setFilters({ ...filters, sellerId: e.target.value })
                  setPage(1)
                }}
                placeholder="ID do vendedor"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setFilters({
                method: '',
                statusCode: '',
                endpoint: '',
                sellerId: '',
              })
              setPage(1)
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Método
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Duração
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(
                            log.method
                          )}`}
                        >
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.endpoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(
                            log.statusCode
                          )}`}
                        >
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.userRole && (
                          <span className="text-gray-600">{log.userRole}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.sellerName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.duration ? `${log.duration}ms` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2">
                Página {page} de {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
