'use client'

import { useEffect, useState } from 'react'
import { FiDownload, FiList, FiGrid, FiFilter, FiX, FiPrinter } from 'react-icons/fi'

type StockSinteticoRow = {
  productId: string
  productName: string
  supplierSku: string | null
  productStock: number
  variantStock: number
  totalStock: number
  variantCount: number
  coresDisponiveis: string[]
  tamanhosDisponiveis: string[]
  updatedAt: string
}

type StockAnaliticoRow = {
  productId: string
  productName: string
  supplierSku: string | null
  variantSku: string
  cor: string
  tamanho: string
  variantAttributes: string
  stock: number
  price?: number
  available?: boolean
  image?: string
  updatedAt: string
}

type ReportMode = 'sintetico' | 'analitico'

export default function RelatoriosPage() {
  const [mode, setMode] = useState<ReportMode>('sintetico')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sintetico, setSintetico] = useState<StockSinteticoRow[]>([])
  const [analitico, setAnalitico] = useState<StockAnaliticoRow[]>([])

  // Filtros
  const [searchSku, setSearchSku] = useState('')
  const [minStock, setMinStock] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadReport()
  }, [mode, searchSku, minStock])

  async function loadReport() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ mode })
      if (searchSku) params.append('sku', searchSku)
      if (minStock) params.append('minStock', minStock)

      const res = await fetch(`/api/admin/relatorios/estoque?${params}`)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || `Erro ${res.status}`)
      }

      const data = await res.json()
      const rows = data.data || data

      if (mode === 'sintetico') {
        setSintetico(rows)
      } else {
        setAnalitico(rows)
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    const rows = mode === 'sintetico' ? sintetico : analitico
    if (!rows.length) return

    const header =
      mode === 'sintetico'
        ? ['Produto', 'SKU', 'Estoque Produto', 'Estoque Variantes', 'Estoque Total', '# Variantes', 'Cores', 'Tamanhos', 'Atualizado em']
        : ['Produto', 'SKU', 'Sub-SKU', 'Cor', 'Tamanho', 'Atributos', 'Estoque', 'Preço', 'Disponível', 'Atualizado em']

    const csvRows = [header]

    for (const row of rows) {
      if (mode === 'sintetico') {
        const r = row as StockSinteticoRow
        csvRows.push([
          r.productName,
          r.supplierSku ?? '',
          r.productStock.toString(),
          r.variantStock.toString(),
          r.totalStock.toString(),
          r.variantCount.toString(),
          r.coresDisponiveis.join(';'),
          r.tamanhosDisponiveis.join(';'),
          new Date(r.updatedAt).toLocaleString(),
        ])
      } else {
        const r = row as StockAnaliticoRow
        csvRows.push([
          r.productName,
          r.supplierSku ?? '',
          r.variantSku,
          r.cor,
          r.tamanho,
          r.variantAttributes,
          r.stock.toString(),
          r.price != null ? r.price.toFixed(2) : '',
          r.available != null ? String(r.available) : '',
          new Date(r.updatedAt).toLocaleString(),
        ])
      }
    }

    const csvContent = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-estoque-${mode}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const totalRows = mode === 'sintetico' ? sintetico.length : analitico.length
  const headerTitle = mode === 'sintetico' ? 'Relatório de Estoque (Sintético)' : 'Relatório de Estoque (Analítico)'
  const description =
    mode === 'sintetico'
      ? 'Visão resumida do estoque por produto (SKU principal) com cores e tamanhos disponíveis.'
      : 'Detalhamento completo por sub-SKU / variantes, com cor, tamanho e estoque.'

  return (
    <div className="p-6 space-y-6 print-body relatorios-print">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{headerTitle}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center print:hidden">
          <button
            onClick={() => setMode('sintetico')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'sintetico' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiList className="inline mr-2" /> Sintético
          </button>
          <button
            onClick={() => setMode('analitico')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'analitico' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiGrid className="inline mr-2" /> Analítico
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <FiFilter /> Filtros
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <FiPrinter /> Imprimir
          </button>
          <button
            onClick={exportCsv}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            disabled={loading || totalRows === 0}
          >
            <FiDownload /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Print header (only visible when printing) */}
      <div className="hidden print:flex print-header items-center justify-between gap-4 border-b border-gray-200 pb-4 print:pb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="h-12 object-contain" />
          <div className="space-y-1">
            <div className="text-lg font-bold">{headerTitle}</div>
            <div className="text-sm text-gray-600">
              Gerado em {new Date().toLocaleString()} • Filtros: SKU "{searchSku || 'todos'}" • Estoque mínimo "{minStock || '0'}"
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500">mydshop.com.br</div>
      </div>

      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por SKU / Produto</label>
              <input
                type="text"
                placeholder="Buscar SKU ou nome..."
                value={searchSku}
                onChange={e => setSearchSku(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estoque Mínimo</label>
              <input
                type="number"
                placeholder="0"
                value={minStock}
                onChange={e => setMinStock(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchSku('')
                  setMinStock('')
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
              >
                <FiX /> Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="text-sm text-gray-600">
            Exibindo <strong>{totalRows}</strong> registro(s)
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                  {mode === 'analitico' ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sub-SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tamanho</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Estoque</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Preço</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Est. Prod</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Est. Var</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Var</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cores</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tamanhos</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(mode === 'sintetico' ? sintetico : analitico).map((row, idx) => {
                  if (mode === 'sintetico') {
                    const r = row as StockSinteticoRow
                    const stockColor =
                      r.totalStock === 0 ? 'text-red-600' : r.totalStock < 10 ? 'text-orange-600' : 'text-green-600'
                    return (
                      <tr key={`${r.productId}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{r.productName}</td>
                        <td className="px-4 py-3 text-gray-700">{r.supplierSku || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{r.productStock}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{r.variantStock}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${stockColor}`}>{r.totalStock}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{r.variantCount}</td>
                        <td className="px-4 py-3">
                          {r.coresDisponiveis.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {r.coresDisponiveis.slice(0, 3).map((cor, i) => (
                                <span key={i} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  {cor}
                                </span>
                              ))}
                              {r.coresDisponiveis.length > 3 && (
                                <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                  +{r.coresDisponiveis.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.tamanhosDisponiveis.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {r.tamanhosDisponiveis.slice(0, 3).map((tam, i) => (
                                <span key={i} className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                                  {tam}
                                </span>
                              ))}
                              {r.tamanhosDisponiveis.length > 3 && (
                                <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                  +{r.tamanhosDisponiveis.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  }

                  const r = row as StockAnaliticoRow
                  const statusBg = r.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  return (
                    <tr key={`${r.productId}-${r.variantSku}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{r.productName}</td>
                      <td className="px-4 py-3 text-gray-700">{r.supplierSku || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.variantSku}</td>
                      <td className="px-4 py-3">
                        {r.cor !== '-' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                            <span
                              className="inline-block w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: getColorHex(r.cor),
                                border: '1px solid rgba(0,0,0,0.3)',
                              }}
                            />
                            {r.cor}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.tamanho !== '-' ? (
                          <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                            {r.tamanho}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">{r.stock}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {r.price != null ? `R$ ${r.price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBg}`}>
                          {r.available ? 'Disponível' : 'Sem estoque'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {totalRows === 0 && (
              <div className="p-6 text-center text-gray-500">Nenhum registro encontrado.</div>
            )}
          </div>
        </>
      )}

      <style jsx global>{`
        @media print {
          .relatorios-print {
            -webkit-print-color-adjust: exact;
          }

          .relatorios-print .print-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            padding: 14px 18px;
            border-bottom: 1px solid #ddd;
            background: white;
            z-index: 9999;
          }

          .relatorios-print .print-body {
            margin-top: 90px;
          }

          .relatorios-print .print-hide {
            display: none !important;
          }

          .relatorios-print table {
            border-collapse: collapse;
          }

          .relatorios-print th,
          .relatorios-print td {
            border: 1px solid #e5e7eb;
            padding: 6px 8px;
          }

          .relatorios-print thead {
            background: #f9fafb;
          }

          .relatorios-print .print-table {
            page-break-inside: avoid;
          }

          .relatorios-print tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}

// Função para converter nome de cor em hexadecimal (simplificada)
function getColorHex(colorName: string): string {
  const colors: Record<string, string> = {
    'vermelho': '#EF4444',
    'red': '#EF4444',
    'branco': '#FFFFFF',
    'white': '#FFFFFF',
    'preto': '#000000',
    'black': '#000000',
    'azul': '#3B82F6',
    'blue': '#3B82F6',
    'verde': '#10B981',
    'green': '#10B981',
    'amarelo': '#FBBF24',
    'yellow': '#FBBF24',
    'roxo': '#8B5CF6',
    'purple': '#8B5CF6',
    'rosa': '#EC4899',
    'pink': '#EC4899',
    'laranja': '#F97316',
    'orange': '#F97316',
    'cinza': '#6B7280',
    'gray': '#6B7280',
    'grey': '#6B7280',
    'marrom': '#92400E',
    'brown': '#92400E',
    'bege': '#C4B5A0',
    'beige': '#C4B5A0',
    'azul marinho': '#001F3F',
    'navy': '#001F3F',
    'cáqui': '#9CA3AF',
    'khaki': '#9CA3AF',
    'dourado': '#D97706',
    'gold': '#D97706',
    'prata': '#D1D5DB',
    'silver': '#D1D5DB',
  }

  const normalized = colorName.toLowerCase().trim()
  return colors[normalized] || '#9CA3AF' // Default gray
}
