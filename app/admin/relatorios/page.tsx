'use client'

import { useEffect, useState, useMemo } from 'react'
import { FiDownload, FiList, FiGrid, FiFilter, FiX, FiPrinter, FiPackage, FiAlertTriangle, FiTrendingUp, FiDollarSign } from 'react-icons/fi'

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
  minPrice?: number
  maxPrice?: number
  totalValue?: number
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
type StatusFilter = 'todos' | 'disponivel' | 'semEstoque'

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function KpiCard({ icon, title, value, subtitle, colorClass }: {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle?: string
  colorClass: string
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4">
      <div className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-white ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function RelatoriosPage() {
  const [mode, setMode] = useState<ReportMode>('sintetico')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sintetico, setSintetico] = useState<StockSinteticoRow[]>([])
  const [analitico, setAnalitico] = useState<StockAnaliticoRow[]>([])

  // Filtros
  const [searchSku, setSearchSku] = useState('')
  const [minStock, setMinStock] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
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
    const rows = mode === 'sintetico' ? filteredSintetico : analiticoGroups.flatMap(g => g.rows)
    if (!rows.length) return

    const header =
      mode === 'sintetico'
        ? ['Produto', 'SKU', 'Est. Produto', 'Est. Variantes', 'Total', '# Variantes', 'Preço Mín', 'Preço Máx', 'Valor em Estoque', 'Cores', 'Tamanhos', 'Atualizado em']
        : ['Produto', 'SKU', 'Sub-SKU', 'Cor', 'Tamanho', 'Estoque', 'Preço', 'Valor', 'Disponível', 'Atualizado em']

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
          r.minPrice != null ? r.minPrice.toFixed(2) : '',
          r.maxPrice != null ? r.maxPrice.toFixed(2) : '',
          r.totalValue != null ? r.totalValue.toFixed(2) : '',
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
          r.stock.toString(),
          r.price != null ? r.price.toFixed(2) : '',
          r.price != null ? (r.price * r.stock).toFixed(2) : '',
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
  // Filtered sintético
  const filteredSintetico = useMemo(() => {
    return sintetico.filter(r => {
      if (statusFilter === 'disponivel') return r.totalStock > 0
      if (statusFilter === 'semEstoque') return r.totalStock === 0
      return true
    })
  }, [sintetico, statusFilter])

  // Grouped analítico (by productId)
  const analiticoGroups = useMemo(() => {
    const filtered = analitico.filter(r => {
      if (statusFilter === 'disponivel') return r.available !== false && r.stock > 0
      if (statusFilter === 'semEstoque') return !r.available || r.stock === 0
      return true
    })
    const groups = new Map<string, { productName: string; supplierSku: string | null; rows: StockAnaliticoRow[] }>()
    for (const row of filtered) {
      if (!groups.has(row.productId)) {
        groups.set(row.productId, { productName: row.productName, supplierSku: row.supplierSku, rows: [] })
      }
      groups.get(row.productId)!.rows.push(row)
    }
    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }))
  }, [analitico, statusFilter])

  // KPI values
  const kpis = useMemo(() => {
    if (mode === 'sintetico') {
      const totalProdutos = sintetico.length
      const totalStock = sintetico.reduce((s, r) => s + r.totalStock, 0)
      const semEstoque = sintetico.filter(r => r.totalStock === 0).length
      const totalValue = sintetico.reduce((s, r) => s + (r.totalValue || 0), 0)
      return { totalProdutos, totalStock, semEstoque, totalValue }
    } else {
      const prodIds = new Set(analitico.map(r => r.productId))
      const totalProdutos = prodIds.size
      const totalStock = analitico.reduce((s, r) => s + r.stock, 0)
      const semEstoque = analitico.filter(r => !r.available || r.stock === 0).length
      const totalValue = analitico.reduce((s, r) => s + (r.price || 0) * r.stock, 0)
      return { totalProdutos, totalStock, semEstoque, totalValue }
    }
  }, [mode, sintetico, analitico])

  const handlePrint = () => window.print()

  const totalRows = mode === 'sintetico' ? filteredSintetico.length : analiticoGroups.flatMap(g => g.rows).length
  const headerTitle = mode === 'sintetico' ? 'Relatório de Estoque — Sintético' : 'Relatório de Estoque — Analítico'
  const description =
    mode === 'sintetico'
      ? 'Visão resumida por produto (SKU): estoque total, faixa de preço e valor em estoque.'
      : 'Detalhamento por sub-SKU / variante, agrupado por produto, com preço unitário e valor.'

  return (
    <div className="p-6 space-y-6 relatorios-print">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{headerTitle}</h1>
          <p className="text-gray-500 mt-1 text-sm">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center print:hidden">
          <button
            onClick={() => setMode('sintetico')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'sintetico' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiList className="inline mr-1.5 -mt-0.5" /> Sintético
          </button>
          <button
            onClick={() => setMode('analitico')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'analitico' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiGrid className="inline mr-1.5 -mt-0.5" /> Analítico
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${showFilters ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <FiFilter /> Filtros
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
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

      {/* Print header */}
      <div className="hidden print:flex print-header items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="h-12 object-contain" />
          <div>
            <div className="text-lg font-bold">{headerTitle}</div>
            <div className="text-sm text-gray-600">Gerado em {new Date().toLocaleString()}</div>
          </div>
        </div>
        <div className="text-xs text-gray-500">mydshop.com.br</div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-5 rounded-xl border shadow-sm print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Buscar por SKU / Produto</label>
              <input
                type="text"
                placeholder="Buscar SKU ou nome..."
                value={searchSku}
                onChange={e => setSearchSku(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Estoque Mínimo</label>
              <input
                type="number"
                placeholder="0"
                value={minStock}
                onChange={e => setMinStock(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="todos">Todos</option>
                <option value="disponivel">Disponível</option>
                <option value="semEstoque">Sem estoque</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setSearchSku(''); setMinStock(''); setStatusFilter('todos') }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 text-sm"
              >
                <FiX /> Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-4/5"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <KpiCard
            icon={<FiPackage size={20} />}
            title="Produtos"
            value={kpis.totalProdutos}
            subtitle={mode === 'sintetico' ? 'SKUs cadastrados' : 'SKUs distintos'}
            colorClass="bg-blue-500"
          />
          <KpiCard
            icon={<FiTrendingUp size={20} />}
            title="Estoque Total"
            value={kpis.totalStock.toLocaleString('pt-BR')}
            subtitle="Unidades em estoque"
            colorClass="bg-emerald-500"
          />
          <KpiCard
            icon={<FiAlertTriangle size={20} />}
            title="Sem Estoque"
            value={kpis.semEstoque}
            subtitle={mode === 'sintetico' ? 'Produtos esgotados' : 'Sub-SKUs esgotados'}
            colorClass={kpis.semEstoque > 0 ? 'bg-red-500' : 'bg-gray-400'}
          />
          <KpiCard
            icon={<FiDollarSign size={20} />}
            title="Valor em Estoque"
            value={formatBRL(kpis.totalValue)}
            subtitle="Estimativa (preço × qtd)"
            colorClass="bg-violet-500"
          />
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Exibindo <strong className="text-gray-800">{totalRows}</strong> {mode === 'sintetico' ? 'produto(s)' : 'sub-SKU(s)'}
            </p>
          </div>

          {/* ——— SINTÉTICO TABLE ——— */}
          {mode === 'sintetico' && (
            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Est. Prod.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Est. Var.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Vars</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Faixa de Preço</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor Estoque</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cores / Tamanhos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSintetico.map((r, idx) => {
                    const stockColor =
                      r.totalStock === 0 ? 'text-red-600 font-bold' :
                      r.totalStock < 5 ? 'text-orange-600 font-semibold' :
                      r.totalStock < 15 ? 'text-yellow-700 font-semibold' :
                      'text-emerald-700 font-semibold'
                    const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    const hasPriceRange = r.minPrice != null && r.maxPrice != null && r.minPrice !== r.maxPrice
                    return (
                      <tr key={`${r.productId}-${idx}`} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px] truncate" title={r.productName}>{r.productName}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.supplierSku || '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{r.productStock}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{r.variantStock}</td>
                        <td className={`px-4 py-3 text-right ${stockColor}`}>{r.totalStock}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{r.variantCount}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                          {r.minPrice != null ? (
                            <>
                              {formatBRL(r.minPrice)}
                              {hasPriceRange && <span className="text-gray-400 mx-1.5">–</span>}
                              {hasPriceRange && formatBRL(r.maxPrice!)}
                            </>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {r.totalValue ? formatBRL(r.totalValue) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {r.coresDisponiveis.slice(0, 3).map((cor, i) => (
                              <span key={`c${i}`} className="inline-flex items-center gap-1 bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-xs">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getColorHex(cor), border: '1px solid rgba(0,0,0,0.2)' }} />
                                {cor}
                              </span>
                            ))}
                            {r.coresDisponiveis.length > 3 && (
                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">+{r.coresDisponiveis.length - 3} cores</span>
                            )}
                            {r.tamanhosDisponiveis.slice(0, 3).map((tam, i) => (
                              <span key={`t${i}`} className="bg-violet-100 text-violet-800 px-2 py-0.5 rounded text-xs">{tam}</span>
                            ))}
                            {r.tamanhosDisponiveis.length > 3 && (
                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">+{r.tamanhosDisponiveis.length - 3}</span>
                            )}
                            {r.coresDisponiveis.length === 0 && r.tamanhosDisponiveis.length === 0 && (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredSintetico.length === 0 && (
                <div className="p-8 text-center text-gray-500">Nenhum registro encontrado.</div>
              )}
            </div>
          )}

          {/* ——— ANALÍTICO TABLE (grouped by product) ——— */}
          {mode === 'analitico' && (
            <div className="space-y-4">
              {analiticoGroups.length === 0 && (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-500">Nenhum registro encontrado.</div>
              )}
              {analiticoGroups.map(group => {
                const groupTotal = group.rows.reduce((s, r) => s + r.stock, 0)
                const groupValue = group.rows.reduce((s, r) => s + (r.price || 0) * r.stock, 0)
                const allUnavailable = group.rows.every(r => !r.available || r.stock === 0)
                const someUnavailable = group.rows.some(r => !r.available || r.stock === 0)

                return (
                  <div key={group.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    {/* Group header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-semibold text-sm truncate">{group.productName}</span>
                        {group.supplierSku && (
                          <span className="text-slate-400 text-xs font-mono shrink-0">{group.supplierSku}</span>
                        )}
                        {allUnavailable ? (
                          <span className="shrink-0 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Sem estoque</span>
                        ) : someUnavailable ? (
                          <span className="shrink-0 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">Parcial</span>
                        ) : (
                          <span className="shrink-0 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">Disponível</span>
                        )}
                      </div>
                      <div className="flex items-center gap-5 shrink-0 text-right text-sm ml-4">
                        <div>
                          <div className="text-slate-400 text-xs">Estoque</div>
                          <div className="font-bold">{groupTotal.toLocaleString('pt-BR')}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs">Valor</div>
                          <div className="font-bold text-emerald-300">{groupValue > 0 ? formatBRL(groupValue) : '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs">Sub-SKUs</div>
                          <div className="font-bold">{group.rows.length}</div>
                        </div>
                      </div>
                    </div>

                    {/* Variant rows */}
                    <table className="min-w-full text-sm divide-y divide-gray-100">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sub-SKU</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cor</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tamanho</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Estoque</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Preço Unit.</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Atualizado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.rows.map((r, idx) => {
                          const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          const isUnavailable = !r.available || r.stock === 0
                          const stockColor =
                            r.stock === 0 ? 'text-red-600 font-bold' :
                            r.stock < 5 ? 'text-orange-600 font-semibold' :
                            'text-emerald-700 font-semibold'
                          const lineValue = r.price != null && r.stock > 0 ? r.price * r.stock : null
                          return (
                            <tr key={`${r.variantSku}-${idx}`} className={`${rowBg} hover:bg-blue-50/30 transition-colors`}>
                              <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.variantSku || '—'}</td>
                              <td className="px-4 py-2.5">
                                {r.cor !== '-' ? (
                                  <span className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorHex(r.cor), border: '1px solid rgba(0,0,0,0.2)' }} />
                                    {r.cor}
                                  </span>
                                ) : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                {r.tamanho !== '-' ? (
                                  <span className="bg-violet-50 border border-violet-200 text-violet-800 px-2.5 py-0.5 rounded-full text-xs font-medium">{r.tamanho}</span>
                                ) : <span className="text-gray-400">—</span>}
                              </td>
                              <td className={`px-4 py-2.5 text-right ${stockColor}`}>{r.stock}</td>
                              <td className="px-4 py-2.5 text-right text-gray-700">
                                {r.price != null ? formatBRL(r.price) : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                                {lineValue != null ? formatBRL(lineValue) : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${isUnavailable ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {isUnavailable ? 'Sem estoque' : 'Disponível'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                                {new Date(r.updatedAt).toLocaleDateString('pt-BR')}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        @media print {
          .relatorios-print { -webkit-print-color-adjust: exact; }
          .relatorios-print .print-header {
            position: fixed; top: 0; left: 0; right: 0;
            padding: 14px 18px; border-bottom: 1px solid #ddd;
            background: white; z-index: 9999;
          }
          .relatorios-print table { border-collapse: collapse; }
          .relatorios-print th, .relatorios-print td { border: 1px solid #e5e7eb; padding: 6px 8px; }
          .relatorios-print thead { background: #f9fafb; }
          .relatorios-print tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}

function getColorHex(colorName: string): string {
  const colors: Record<string, string> = {
    'vermelho': '#EF4444', 'red': '#EF4444',
    'branco': '#FFFFFF', 'white': '#FFFFFF',
    'preto': '#000000', 'black': '#000000',
    'azul': '#3B82F6', 'blue': '#3B82F6',
    'verde': '#10B981', 'green': '#10B981',
    'amarelo': '#FBBF24', 'yellow': '#FBBF24',
    'roxo': '#8B5CF6', 'purple': '#8B5CF6',
    'rosa': '#EC4899', 'pink': '#EC4899',
    'laranja': '#F97316', 'orange': '#F97316',
    'cinza': '#6B7280', 'gray': '#6B7280', 'grey': '#6B7280',
    'marrom': '#92400E', 'brown': '#92400E',
    'bege': '#C4B5A0', 'beige': '#C4B5A0',
    'azul marinho': '#001F3F', 'navy': '#001F3F',
    'cáqui': '#9CA3AF', 'khaki': '#9CA3AF',
    'dourado': '#D97706', 'gold': '#D97706',
    'prata': '#D1D5DB', 'silver': '#D1D5DB',
  }
  return colors[colorName.toLowerCase().trim()] || '#9CA3AF'
}
