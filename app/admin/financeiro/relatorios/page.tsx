'use client'

import { useEffect, useState } from 'react'
import { FiDownload, FiBarChart2, FiTrendingUp, FiDollarSign, FiPackage } from 'react-icons/fi'

interface Resumo {
  totalVendas: number
  totalPedidos: number
  totalComissoes: number
  totalComissoesPagas: number
  totalComissoesPendentes: number
  lucroPlataforma: number
  ticketMedio: number
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

interface RelatorioData {
  periodo: number
  resumo: Resumo
  vendedores: Vendedor[]
  graficoVendas: GraficoVenda[]
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-600 font-medium">Total Vendas</p>
            <FiDollarSign className="text-blue-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            R$ {data?.resumo.totalVendas.toFixed(2)}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {data?.resumo.totalPedidos} pedidos
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-600 font-medium">Comissões Totais</p>
            <FiPackage className="text-purple-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            R$ {data?.resumo.totalComissoes.toFixed(2)}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            Pagas: R$ {data?.resumo.totalComissoesPagas.toFixed(2)}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-600 font-medium">Lucro Plataforma</p>
            <FiTrendingUp className="text-green-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            R$ {data?.resumo.lucroPlataforma.toFixed(2)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {((data?.resumo.lucroPlataforma || 0) / (data?.resumo.totalVendas || 1) * 100).toFixed(1)}% margem
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-yellow-600 font-medium">Ticket Médio</p>
            <FiBarChart2 className="text-yellow-500 text-2xl" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            R$ {data?.resumo.ticketMedio.toFixed(2)}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Pendente: R$ {data?.resumo.totalComissoesPendentes.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Gráfico Simples de Vendas */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Vendas por Dia</h2>
        <div className="flex items-end gap-1 h-48">
          {data?.graficoVendas.slice(-14).map((dia, idx) => {
            const maxVenda = Math.max(...(data?.graficoVendas.map(d => d.vendas) || [1]))
            const altura = (dia.vendas / maxVenda) * 100
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group">
                <div 
                  className="w-full bg-blue-500 hover:bg-blue-600 transition-all rounded-t cursor-pointer relative"
                  style={{ height: `${altura}%` }}
                  title={`${dia.data}: R$ ${dia.vendas.toFixed(2)} (${dia.pedidos} pedidos)`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    R$ {dia.vendas.toFixed(0)}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                  {new Date(dia.data).getDate()}/{new Date(dia.data).getMonth() + 1}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabela de Vendedores */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold">Desempenho por Vendedor</h2>
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
                  <td className="px-6 py-4 text-right font-medium">R$ {vendedor.totalVendido.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium text-blue-600">R$ {vendedor.totalComissao.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-green-600">R$ {vendedor.comissaoPaga.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-yellow-600">R$ {vendedor.comissaoPendente.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">{vendedor.quantidadePedidos}</td>
                  <td className="px-6 py-4 text-center">{vendedor.quantidadeItens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!data?.vendedores || data.vendedores.length === 0) && (
          <div className="p-8 text-center text-gray-500">
            Nenhum dado encontrado para o período selecionado
          </div>
        )}
      </div>
    </div>
  )
}
