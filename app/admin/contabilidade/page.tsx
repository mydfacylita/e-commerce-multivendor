'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown,
  FiDownload,
  FiFilter,
  FiCalendar,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiShoppingCart,
  FiPackage,
  FiBox,
  FiTruck,
  FiRefreshCw,
  FiCreditCard,
  FiPercent,
  FiFileText
} from 'react-icons/fi'

interface Transaction {
  id: string
  date: string
  type: 'ENTRADA' | 'SAIDA'
  category: string
  description: string
  reference: string | null
  value: number
  balance?: number
}

interface Summary {
  totalEntradas: number
  totalSaidas: number
  saldo: number
  vendasBrutas: number
  comissoes: number
  fretes: number
  reembolsos: number
  saques: number
  custoEtiquetas: number
}

interface CategoryBreakdown {
  category: string
  type: 'ENTRADA' | 'SAIDA'
  total: number
  count: number
}

export default function ContabilidadePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    category: '',
    search: ''
  })

  useEffect(() => {
    loadData()
  }, [page, filters])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.type && { type: filters.type }),
        ...(filters.category && { category: filters.category }),
        ...(filters.search && { search: filters.search })
      })

      const res = await fetch(`/api/admin/contabilidade?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar dados')

      const data = await res.json()
      setTransactions(data.transactions)
      setSummary(data.summary)
      setBreakdown(data.breakdown)
      setTotalPages(data.pagination.totalPages)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.type && { type: filters.type }),
        ...(filters.category && { category: filters.category })
      })

      const res = await fetch(`/api/admin/contabilidade?${params}`)
      if (!res.ok) throw new Error('Erro ao exportar')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contabilidade-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Relatório exportado com sucesso!')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      'Venda': <FiShoppingCart className="text-green-500" />,
      'Comissão Marketplace': <FiPercent className="text-purple-500" />,
      'Frete Pago': <FiTruck className="text-blue-500" />,
      'Reembolso': <FiRefreshCw className="text-orange-500" />,
      'Saque Vendedor': <FiCreditCard className="text-red-500" />,
      'Custo Etiqueta': <FiFileText className="text-gray-500" />,
      'Custo Fornecedor': <FiPackage className="text-amber-500" />,
      'Custo Embalagem': <FiBox className="text-yellow-600" />
    }
    return icons[category] || <FiDollarSign className="text-gray-400" />
  }

  const getCategoryColor = (category: string, type: string) => {
    if (type === 'ENTRADA') return 'text-green-600'
    return 'text-red-600'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FiDollarSign className="text-green-600" />
            Contabilidade
          </h1>
          <p className="text-gray-600">Entradas e saídas financeiras</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <FiDownload />
          Exportar CSV
        </button>
      </div>

      {/* Cards de Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Entradas */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalEntradas)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FiTrendingUp className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          {/* Total Saídas */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Saídas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalSaidas)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <FiTrendingDown className="text-red-600 text-xl" />
              </div>
            </div>
          </div>

          {/* Saldo */}
          <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${summary.saldo >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo</p>
                <p className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(summary.saldo)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${summary.saldo >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                <FiDollarSign className={`text-xl ${summary.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
          </div>

          {/* Vendas Brutas */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vendas Brutas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(summary.vendasBrutas)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FiShoppingCart className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalhamento por Categoria */}
      {breakdown.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Entradas por Categoria */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FiArrowUp className="text-green-500" />
              Detalhamento Entradas
            </h3>
            <div className="space-y-2">
              {breakdown
                .filter(b => b.type === 'ENTRADA')
                .map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(item.category)}
                      <span className="text-sm">{item.category}</span>
                      <span className="text-xs text-gray-500">({item.count})</span>
                    </div>
                    <span className="font-medium text-green-600">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Saídas por Categoria */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FiArrowDown className="text-red-500" />
              Detalhamento Saídas
            </h3>
            <div className="space-y-2">
              {breakdown
                .filter(b => b.type === 'SAIDA')
                .map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(item.category)}
                      <span className="text-sm">{item.category}</span>
                      <span className="text-xs text-gray-500">({item.count})</span>
                    </div>
                    <span className="font-medium text-red-600">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
          >
            <FiFilter />
            Filtros
          </button>

          <div className="flex items-center gap-2">
            <FiCalendar className="text-gray-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-500">até</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por descrição ou referência..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Todos</option>
                <option value="ENTRADA">Entradas</option>
                <option value="SAIDA">Saídas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Todas</option>
                <option value="Venda">Vendas</option>
                <option value="Frete Pago">Frete Pago</option>
                <option value="Comissão Marketplace">Comissões</option>
                <option value="Reembolso">Reembolsos</option>
                <option value="Saque Vendedor">Saques</option>
                <option value="Custo Etiqueta">Custo Etiquetas</option>
                <option value="Custo Fornecedor">Custo Fornecedores</option>
                <option value="Custo Embalagem">Custo Embalagens</option>
              </select>
            </div>

            <div className="col-span-2 flex items-end">
              <button
                onClick={() => setFilters({ startDate: '', endDate: '', type: '', category: '', search: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Transações */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <FiDollarSign className="mx-auto text-gray-400 text-5xl mb-4" />
          <p className="text-gray-600">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Referência
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          tx.type === 'ENTRADA' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.type === 'ENTRADA' ? <FiArrowUp /> : <FiArrowDown />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(tx.category)}
                          <span className="text-sm">{tx.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {tx.description}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {tx.reference ? (
                          <button
                            onClick={() => {
                              if (tx.category === 'Venda' || tx.category === 'Frete Pago') {
                                router.push(`/admin/pedidos/${tx.reference}`)
                              } else if (tx.category === 'Reembolso') {
                                router.push(`/admin/refunds`)
                              }
                            }}
                            className="text-blue-600 hover:underline font-mono text-xs"
                          >
                            #{tx.reference.substring(0, 8)}...
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${getCategoryColor(tx.category, tx.type)}`}>
                        {tx.type === 'ENTRADA' ? '+' : '-'}{formatCurrency(Math.abs(tx.value))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
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
