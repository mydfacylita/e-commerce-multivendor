'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

interface Props {
  counts: {
    total: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    notSent: number
    late: number
  }
}

const STATUS_TABS = [
  { key: '',           label: 'Todos' },
  { key: 'PROCESSING', label: 'Processando' },
  { key: 'SHIPPED',    label: 'Enviado' },
  { key: 'DELIVERED',  label: 'Entregue' },
  { key: 'CANCELLED',  label: 'Cancelado' },
  { key: 'not_sent',   label: '⚠️ Não enviados' },
  { key: 'late',       label: '🔴 Atrasados' },
]

export default function OrdersFilter({ counts }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus  = searchParams.get('status') || ''
  const currentSearch  = searchParams.get('search') || ''
  const currentOrigin  = searchParams.get('origin') || ''
  const currentType    = searchParams.get('type')  || ''

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    // limpa status ao aplicar outro filtro principal
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }, [searchParams, pathname, router])

  const clearAll = () => {
    startTransition(() => router.push(pathname))
  }

  const hasFilters = currentStatus || currentSearch || currentOrigin || currentType

  const tabCount = (key: string) => {
    if (key === '')          return counts.total
    if (key === 'PROCESSING') return counts.processing
    if (key === 'SHIPPED')    return counts.shipped
    if (key === 'DELIVERED')  return counts.delivered
    if (key === 'CANCELLED')  return counts.cancelled
    if (key === 'not_sent')   return counts.notSent
    if (key === 'late')       return counts.late
    return 0
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-4">
      {/* Busca + filtros */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por cliente, pedido..."
            defaultValue={currentSearch}
            onChange={e => updateParam('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Origem */}
        <select
          value={currentOrigin}
          onChange={e => updateParam('origin', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas origens</option>
          <option value="site">Site</option>
          <option value="ml">Mercado Livre</option>
          <option value="app">App</option>
        </select>

        {/* Tipo */}
        <select
          value={currentType}
          onChange={e => updateParam('type', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos tipos</option>
          <option value="adm">ADM / Plataforma</option>
          <option value="drop">Dropshipping</option>
          <option value="hybrid">Híbrido</option>
        </select>

        {/* Limpar filtros */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <FiX size={14} />
            Limpar
          </button>
        )}

        {isPending && (
          <span className="text-xs text-gray-400 animate-pulse">Filtrando...</span>
        )}
      </div>

      {/* Abas de status */}
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {STATUS_TABS.map(tab => {
          const count = tabCount(tab.key)
          const isActive = currentStatus === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => updateParam('status', tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
