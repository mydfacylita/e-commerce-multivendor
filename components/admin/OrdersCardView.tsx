'use client'

import Link from 'next/link'
import {
  FiEye, FiPackage, FiAlertCircle, FiLayers,
  FiUser, FiClock, FiCheckCircle, FiXCircle,
  FiTruck, FiMapPin, FiCalendar
} from 'react-icons/fi'
import UpdateOrderStatusButton from '@/components/admin/UpdateOrderStatusButton'
import SendToSupplierButton from '@/components/admin/SendToSupplierButton'
import PrintShippingLabelButton from '@/components/admin/PrintShippingLabelButton'

export interface OrderCard {
  id: string
  displayId: string
  isHybrid: boolean
  subOrderIds: string[]
  total: number
  status: string
  sentToSupplier: boolean
  createdAt: string
  buyerName: string | null
  buyerEmail: string | null
  marketplaceOrderId: string | null
  marketplaceName: string | null
  itemCount: number
  hasDropshipping: boolean
  hasADM: boolean
  hasSupplier: boolean
  sellers: string[]
  // atraso
  delayDays: number | null    // null = sem info, >0 = atrasado, <=0 = no prazo
  estimatedDelivery: string | null
  shippingMethod: string | null
  deliveryDays: number | null
  // financiamento (carnê)
  carne: {
    totalValue: number
    totalWithInterest: number | null
    interestRate: number
    parcelas: { id: string; numero: number; valor: number; status: string }[]
  } | null
}

interface Props {
  orders: OrderCard[]
}

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: JSX.Element; bg: string; text: string }> = {
  PENDING:    { label: 'Pendente',     icon: <FiClock size={14} />,      bg: 'bg-gray-100',   text: 'text-gray-700' },
  PROCESSING: { label: 'Processando', icon: <FiClock size={14} />,      bg: 'bg-yellow-100', text: 'text-yellow-800' },
  SHIPPED:    { label: 'Enviado',     icon: <FiTruck size={14} />,      bg: 'bg-blue-100',   text: 'text-blue-800' },
  DELIVERED:  { label: 'Entregue',    icon: <FiCheckCircle size={14} />,bg: 'bg-green-100',  text: 'text-green-800' },
  CANCELLED:  { label: 'Cancelado',   icon: <FiXCircle size={14} />,    bg: 'bg-red-100',    text: 'text-red-800' },
}

function OriginBadge({ order }: { order: OrderCard }) {
  if (order.marketplaceOrderId) {
    const name = (order.marketplaceName || '').toLowerCase()
    if (name === 'shopee')
      return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Shopee</span>
    if (name.includes('mercado') || name === 'ml')
      return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">ML</span>
    // fallback genérico com o nome do marketplace
    return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">{order.marketplaceName || 'MP'}</span>
  }
  if (order.marketplaceName === 'APP')
    return <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-bold">📱 APP</span>
  return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">Site</span>
}

function TypeBadge({ order }: { order: OrderCard }) {
  if (order.isHybrid)
    return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">🔄 Híbrido</span>
  if (order.hasDropshipping)
    return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">📦 DROP</span>
  return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">🏪 ADM</span>
}

function DelayBadge({ days, status }: { days: number | null; status: string }) {
  if (status === 'DELIVERED' || status === 'CANCELLED') return null
  if (days === null) return null

  if (days > 0) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
        🔴 {days}d atrasado
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
        📬 Entrega hoje
      </span>
    )
  }
  if (days >= -2) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
        ⏳ {Math.abs(days)}d p/ entrega
      </span>
    )
  }
  return null
}

function CarneTag({ carne }: { carne: OrderCard['carne'] }) {
  if (!carne) return null
  const total = carne.parcelas.length
  const paid  = carne.parcelas.filter(p => p.status === 'PAID').length
  const valorParcela = total > 0 ? (carne.totalWithInterest ?? carne.totalValue) / total : 0
  return (
    <div className="flex items-start gap-1.5 mt-2 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5">
      <span className="text-violet-500 mt-0.5 text-base leading-none">💳</span>
      <div>
        <p className="text-xs font-bold text-violet-700">
          Financiado · {total}x de R$ {valorParcela.toFixed(2)}
        </p>
        <p className="text-xs text-violet-500">
          Total: R$ {(carne.totalWithInterest ?? carne.totalValue).toFixed(2)}
          {carne.interestRate > 0 && ` · ${carne.interestRate}% a.m.`}
          {` · ${paid}/${total} pago${paid !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────
export default function OrdersCardView({ orders }: Props) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
        <FiPackage size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Nenhum pedido encontrado</p>
        <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {orders.map(order => {
        const st  = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
        const isLate = (order.delayDays ?? -999) > 0
        const borderClass = isLate
          ? 'border-red-300 bg-red-50/30'
          : 'border-gray-200 bg-white'

        const clientName  = order.buyerName  || 'N/A'
        const clientEmail = order.buyerEmail || ''
        const dateObj     = new Date(order.createdAt)
        const dateStr     = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
        const timeStr     = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

        return (
          <div
            key={order.id}
            className={`rounded-xl border hover:shadow-md transition-shadow ${borderClass}`}
          >
            <div className="flex items-stretch divide-x divide-gray-100">

              {/* Número + badges */}
              <div className="flex flex-col justify-center px-4 py-3 w-44 flex-shrink-0">
                <Link
                  href={`/admin/pedidos/${order.isHybrid ? order.subOrderIds[0] : order.id}`}
                  className="font-mono font-bold text-primary-600 hover:underline text-sm"
                >
                  #{formatShort(order.isHybrid ? order.displayId : order.id)}
                </Link>
                {order.isHybrid && (
                  <span className="text-xs text-purple-500 flex items-center gap-1 mt-0.5">
                    <FiLayers size={11} /> {order.subOrderIds.length} sub-pedidos
                  </span>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  <OriginBadge order={order} />
                  <TypeBadge order={order} />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <FiCalendar size={11} />
                  {dateStr} {timeStr}
                </div>
              </div>

              {/* Cliente */}
              <div className="flex flex-col justify-center px-4 py-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FiUser size={14} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{clientName}</p>
                    {clientEmail && <p className="text-xs text-gray-400 truncate">{clientEmail}</p>}
                  </div>
                </div>
                {/* Vendedores / Plataforma */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {order.hasADM && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">🏢 Plataforma</span>
                  )}
                  {order.sellers.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                      👤 {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Total + itens */}
              <div className="flex flex-col justify-center px-4 py-3 w-44 flex-shrink-0">
                <p className="text-xl font-bold text-gray-900">
                  R$ {order.total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {order.itemCount} {order.itemCount === 1 ? 'produto' : 'produtos'}
                </p>
                {order.shippingMethod && (
                  <p className="text-xs text-gray-400 mt-1 truncate flex items-center gap-1">
                    <FiTruck size={11} /> {order.shippingMethod}
                  </p>
                )}
                {order.deliveryDays && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <FiMapPin size={11} /> {order.deliveryDays}d úteis
                  </p>
                )}
                <CarneTag carne={order.carne} />
              </div>

              {/* Status + atraso */}
              <div className="flex flex-col justify-center px-4 py-3 w-44 flex-shrink-0 hidden md:flex">
                <div className="flex flex-wrap gap-1 items-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
                    {st.icon}
                    {st.label}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <DelayBadge days={order.delayDays} status={order.status} />
                  {order.estimatedDelivery && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                    <p className="text-xs text-gray-400">
                      📅 Prev: {new Date(order.estimatedDelivery).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              {/* Fornecedor */}
              <div className="flex flex-col justify-center px-4 py-3 w-36 flex-shrink-0 hidden lg:flex">
                <p className="text-xs text-gray-500 mb-1">Fornecedor</p>
                {order.sentToSupplier ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <FiPackage size={14} />
                    Enviado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 text-sm">
                    <FiAlertCircle size={14} />
                    Pendente
                  </span>
                )}
              </div>

              {/* Ações */}
              <div className="flex flex-col items-center justify-center px-4 py-3 gap-2 flex-shrink-0">
                {!order.isHybrid && order.status !== 'CANCELLED' && (
                  <UpdateOrderStatusButton orderId={order.id} currentStatus={order.status} />
                )}
                <div className="flex items-center gap-1">
                  {order.marketplaceOrderId && order.status !== 'CANCELLED' && !order.isHybrid && (
                    <PrintShippingLabelButton
                      orderId={order.subOrderIds[0]}
                      marketplace="mercadolivre"
                    />
                  )}
                  {order.hasSupplier &&
                    !order.sentToSupplier &&
                    order.status !== 'CANCELLED' &&
                    order.status !== 'PENDING' &&
                    !order.isHybrid && (
                      <SendToSupplierButton
                        orderId={order.subOrderIds[0]}
                        sentToSupplier={order.sentToSupplier}
                      />
                    )}
                  <Link
                    href={`/admin/pedidos/${order.isHybrid ? order.subOrderIds[0] : order.id}`}
                    className={`p-1.5 rounded-md transition-colors ${
                      order.isHybrid
                        ? 'text-purple-600 hover:bg-purple-50'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                    title="Ver detalhes"
                  >
                    {order.isHybrid ? (
                      <span className="flex items-center gap-0.5">
                        <FiLayers size={14} />
                        <FiEye size={16} />
                      </span>
                    ) : (
                      <FiEye size={18} />
                    )}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatShort(id: string) {
  // Se for numérico puro (ML), retorna direto; senão pega últimos 6 chars
  if (/^\d+$/.test(id)) return id.slice(-8)
  return id.slice(-8)
}
