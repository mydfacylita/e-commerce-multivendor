'use client'

import { useEffect, useState } from 'react'
import { FiDownload, 
  FiBarChart2, 
  FiTrendingUp, 
  FiDollarSign, 
  FiPackage,
  FiTrendingDown,
  FiPieChart,
  FiShoppingBag,
  FiCreditCard
} from 'react-icons/fi'
interface Resumo {
  totalVendas: number
  totalPedidos: number
  totalComissoes: number
  totalComissoesPagas: number
  totalComissoesPendentes: number
  lucroPlataforma: number
  ticketMedio: number
}

interface Receitas {
  vendas: number
  comissoes: number
  frete: number
  planos: number
  total: number
}

interface Despesas {
  comissoesVendedores: number
  taxasGateway: number
  custosFrete: number
  total: number
}

interface Vendedor {
  sellerId: string
  sellerName: string
  sellerOwner: string
  totalComissao: number
  totalVendido: number
  quantidadePedidos: number
  quantidadeItens: number
  comissaoPaga: number
  comissaoPendente: number
}

interface GraficoVenda {
  data: string
  vendas: number
  pedidos: number
}

interface ProdutoMaisVendido {
  productId: string
  productName: string
  quantidade: number
  valorTotal: number
  isDrop: boolean
}

interface ReceitaPorPlano {
  nome: string
  quantidade: number
  receita: number
}

interface RelatorioData {
  periodo: number
  resumo: Resumo
  receitas: Receitas
  despesas: Despesas
  lucroLiquido: number
  vendedores: Vendedor[]
  graficoVendas: GraficoVenda[]
  produtosMaisVendidos: ProdutoMaisVendido[]
  receitaPorPlano: ReceitaPorPlano[]
  totalAssinaturasAtivas: number
  totalAssinaturasTrial: number
}

export default function RelatoriosPage() {
  const [data, setData] = useState<RelatorioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')

  useEffect(() => {
    loadData()
  }, [periodo])

  async function loadData() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/financeiro/relatorio?periodo=${periodo}`)
      if (response.ok) {
        const json = await response.json()
        setData(json)
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
    } finally {
      setLoading(false)
    }
  }

  function exportarCSV() {
    if (!data) return

    const csv = [
      ['Vendedor', 'Proprietário', 'Total Vendido', 'Comissão Total', 'Comissão Paga', 'Comissão Pendente', 'Pedidos', 'Itens'],
      ...data.vendedores.map(v => [
        v.sellerName,
        v.sellerOwner,
        v.totalVendido.toFixed(2),
        v.totalComissao.toFixed(2),
        v.comissaoPaga.toFixed(2),
        v.comissaoPendente.toFixed(2),
        v.quantidadePedidos,
        v.quantidadeItens
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-vendedores-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios Financeiros</h1>
          <p className="text-gray-600">Análise completa de vendas e comissões</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>

          <button
            onClick={exportarCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FiDownload />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Cards de Resumo Expandidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Vendas */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-600 font-medium">Total Vendas</p>
            <FiDollarSign className="text-blue-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            R$ {data?.resumo.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {data?.resumo.totalPedidos} pedidos
          </p>
        </div>

        {/* Receita Planos */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-indigo-600 font-medium">Receita Planos</p>
            <FiCreditCard className="text-indigo-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-indigo-900">
            R$ {data?.receitas.planos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            {data?.totalAssinaturasAtivas || 0} ativas
          </p>
        </div>

        {/* Receitas Totais */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-600 font-medium">Receitas Totais</p>
            <FiTrendingUp className="text-green-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            R$ {data?.receitas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Comissões: R$ {data?.receitas.comissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Despesas Totais */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-red-600 font-medium">Despesas Totais</p>
            <FiTrendingDown className="text-red-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-red-900">
            R$ {data?.despesas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-red-600 mt-1">
            Comissões + Taxas
          </p>
        </div>

        {/* Lucro Líquido */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-600 font-medium">Lucro Líquido</p>
            <FiPieChart className="text-purple-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            R$ {data?.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            {((data?.lucroLiquido || 0) / (data?.receitas.total || 1) * 100).toFixed(1)}% margem
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-yellow-600 font-medium">Ticket Médio</p>
            <FiBarChart2 className="text-yellow-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            R$ {data?.resumo.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Por pedido
          </p>
        </div>
      </div>

      {/* Grid de Receitas e Despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receitas Detalhadas */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-green-500" />
            Receitas Detalhadas
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Vendas de Produtos</span>
              <span className="text-lg font-bold text-green-700">
                R$ {data?.receitas.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Comissões Recebidas</span>
              <span className="text-lg font-bold text-blue-700">
                R$ {data?.receitas.comissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Receita com Frete</span>
              <span className="text-lg font-bold text-purple-700">
                R$ {data?.receitas.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Receita com Planos</span>
              <span className="text-lg font-bold text-indigo-700">
                R$ {data?.receitas.planos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg border-2 border-green-300">
              <span className="text-sm font-bold text-gray-800">Total de Receitas</span>
              <span className="text-xl font-bold text-green-800">
                R$ {data?.receitas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Despesas Detalhadas */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FiTrendingDown className="text-red-500" />
            Despesas Detalhadas
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Comissões a Vendedores</span>
              <span className="text-lg font-bold text-red-700">
                R$ {data?.despesas.comissoesVendedores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Taxas de Gateway (3.99%)</span>
              <span className="text-lg font-bold text-orange-700">
                R$ {data?.despesas.taxasGateway.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Custos de Frete</span>
              <span className="text-lg font-bold text-yellow-700">
                R$ {data?.despesas.custosFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg border-2 border-red-300">
              <span className="text-sm font-bold text-gray-800">Total de Despesas</span>
              <span className="text-xl font-bold text-red-800">
                R$ {data?.despesas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Receita por Planos */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <FiCreditCard className="text-indigo-500" />
          Receita por Planos de Assinatura
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Assinaturas Ativas</p>
                <p className="text-3xl font-bold text-indigo-900 mt-1">
                  {data?.totalAssinaturasAtivas || 0}
                </p>
              </div>
              <FiTrendingUp className="text-indigo-500 text-4xl" />
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Em Período Trial</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {data?.totalAssinaturasTrial || 0}
                </p>
              </div>
              <FiPackage className="text-purple-500 text-4xl" />
            </div>
          </div>
        </div>

        {data?.receitaPorPlano && data.receitaPorPlano.length > 0 ? (
          <div className="space-y-3">
            {data.receitaPorPlano.map((plano, idx) => (
              <div key={idx} className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{plano.nome}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {plano.quantidade} assinatura{plano.quantidade !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-700">
                      R$ {plano.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Média: R$ {(plano.receita / plano.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-indigo-100 border-2 border-indigo-300 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Total Receita de Planos</span>
                <span className="text-2xl font-bold text-indigo-700">
                  R$ {data?.receitas.planos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhuma receita de planos no período selecionado
          </div>
        )}
      </div>

      {/* Gráfico de Vendas por Dia */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Vendas por Dia (Últimos 14 dias)</h2>
        <div className="flex items-end gap-1 h-64 border-l border-b border-gray-200 pl-2 pb-2">
          {data?.graficoVendas.slice(-14).map((dia, idx) => {
            const maxVenda = Math.max(...(data?.graficoVendas.map(d => d.vendas) || [1]))
            const altura = (dia.vendas / maxVenda) * 90
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group">
                <div 
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 transition-all rounded-t cursor-pointer relative"
                  style={{ height: `${altura}%` }}
                >
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10">
                    <div className="font-semibold">
                      {new Date(dia.data).toLocaleDateString('pt-BR')}
                    </div>
                    <div>R$ {dia.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="text-gray-300">{dia.pedidos} pedidos</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                  {new Date(dia.data).getDate()}/{new Date(dia.data).getMonth() + 1}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Produtos Mais Vendidos */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FiShoppingBag className="text-primary-600" />
            Top 10 Produtos Mais Vendidos
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.produtosMaisVendidos.map((produto, idx) => (
                <tr key={produto.productId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {idx + 1}º
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{produto.productName}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {produto.isDrop ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                        Drop
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                        Próprio
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {produto.quantidade} un
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">
                    R$ {produto.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!data?.produtosMaisVendidos || data.produtosMaisVendidos.length === 0) && (
          <div className="p-8 text-center text-gray-500">
            Nenhum produto vendido no período
          </div>
        )}
      </div>

      {/* Tabela de Vendedores */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FiCreditCard className="text-primary-600" />
            Desempenho por Vendedor
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proprietário</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Vendido</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paga</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendente</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Itens</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.vendedores.map((vendedor) => (
                <tr key={vendedor.sellerId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{vendedor.sellerName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{vendedor.sellerOwner}</td>
                  <td className="px-6 py-4 text-right font-medium">
                    R$ {vendedor.totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-blue-600">
                    R$ {vendedor.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600">
                    R$ {vendedor.comissaoPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-yellow-600">
                    R$ {vendedor.comissaoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">{vendedor.quantidadePedidos}</td>
                  <td className="px-6 py-4 text-center">{vendedor.quantidadeItens}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 font-bold">
              <tr>
                <td colSpan={2} className="px-6 py-4 text-gray-900">TOTAIS</td>
                <td className="px-6 py-4 text-right text-gray-900">
                  R$ {data?.vendedores.reduce((sum, v) => sum + v.totalVendido, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right text-blue-600">
                  R$ {data?.vendedores.reduce((sum, v) => sum + v.totalComissao, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right text-green-600">
                  R$ {data?.vendedores.reduce((sum, v) => sum + v.comissaoPaga, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right text-yellow-600">
                  R$ {data?.vendedores.reduce((sum, v) => sum + v.comissaoPendente, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-center text-gray-900">
                  {data?.vendedores.reduce((sum, v) => sum + v.quantidadePedidos, 0)}
                </td>
                <td className="px-6 py-4 text-center text-gray-900">
                  {data?.vendedores.reduce((sum, v) => sum + v.quantidadeItens, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {(!data?.vendedores || data.vendedores.length === 0) && (
          <div className="p-8 text-center text-gray-500">
            Nenhum vendedor com vendas no período selecionado
          </div>
        )}
      </div>
    </div>
  )
}
