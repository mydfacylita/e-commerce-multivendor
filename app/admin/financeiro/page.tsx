'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiAlertCircle, FiRefreshCw, FiFileText, FiBarChart2, FiDollarSign, FiCreditCard } from 'react-icons/fi'

interface Stats {
  totalApproved: number
  totalPending: number
  totalRefunded: number
  duplicatesCount: number
}

export default function FinanceiroPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/financeiro/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    { 
      id: 'duplicados', 
      label: 'Pagamentos Duplicados', 
      icon: FiAlertCircle, 
      href: '/admin/financeiro/duplicados', 
      badge: stats?.duplicatesCount,
      description: 'Detectar e estornar pagamentos duplicados'
    },
    { 
      id: 'estornos', 
      label: 'Histórico de Estornos', 
      icon: FiRefreshCw, 
      href: '/admin/financeiro/estornos',
      description: 'Ver todos os estornos realizados'
    },
    { 
      id: 'notas', 
      label: 'Notas Fiscais', 
      icon: FiFileText, 
      href: '/admin/financeiro/notas',
      description: 'Gerenciar emissão de NFe'
    },
    { 
      id: 'relatorios', 
      label: 'Relatórios', 
      icon: FiBarChart2, 
      href: '/admin/financeiro/relatorios',
      description: 'Análises e relatórios financeiros'
    },
    { 
      id: 'pagamentos', 
      label: 'Pagamentos Dropshipping', 
      icon: FiDollarSign, 
      href: '/admin/financeiro/pagamentos',
      description: 'Aprovar pagamentos de comissões e saques de vendedores'
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Financeiro</h1>

      {/* Estatísticas compactas */}
      {!loading && stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Aprovado</p>
            <p className="text-xl font-bold text-green-600">R$ {stats.totalApproved.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Pendente</p>
            <p className="text-xl font-bold text-yellow-600">R$ {stats.totalPending.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Estornado</p>
            <p className="text-xl font-bold text-red-600">R$ {stats.totalRefunded.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Duplicados</p>
            <p className="text-xl font-bold text-orange-600">{stats.duplicatesCount}</p>
          </div>
        </div>
      )}

      {/* Lista simples de opções */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left ${
                index !== menuItems.length - 1 ? 'border-b border-gray-200' : ''
              }`}
            >
              <div className="flex items-center space-x-4">
                <Icon className="text-2xl text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
