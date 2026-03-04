import { prisma } from '@/lib/prisma'
import AutoFetchOrders from '@/components/admin/AutoFetchOrders'
import OrdersFilter from '@/components/admin/OrdersFilter'
import OrdersCardView, { OrderCard } from '@/components/admin/OrdersCardView'
import { FiShoppingBag, FiClock, FiAlertCircle, FiTruck, FiCheckCircle } from 'react-icons/fi'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Tipo para pedidos agrupados
interface GroupedOrder {
  id: string
  displayId: string
  parentOrderId: string | null
  isHybrid: boolean
  subOrderIds: string[]
  combinedTotal: number
  combinedItems: any[]
  status: string
  sentToSupplier: boolean
  createdAt: Date
  buyerName: string | null
  buyerEmail: string | null
  user: { name: string | null; email: string | null } | null
  marketplaceOrderId: string | null
  marketplaceName: string | null
  items: any[]
  hasDropshipping: boolean
  hasStock: boolean
  hasADM: boolean
  hasSupplier: boolean
  sellers: string[]
  // campos de entrega
  deliveryDays: number | null
  shippedAt: Date | null
  paymentApprovedAt: Date | null
  shippingMethod: string | null
  // financiamento (carnê)
  carne: {
    totalValue: number
    totalWithInterest: number | null
    interestRate: number
    parcelas: { id: string; numero: number; valor: number; status: string }[]
  } | null
}

// Função para filtrar itens ADM (plataforma) e DROP
// Exclui itens STOCK de vendedores (sellerId != null)
function filterAdmItems(items: any[]) {
  return items.filter(item => {
    // DROP: sempre inclui
    if (item.itemType === 'DROPSHIPPING') return true
    // ADM: STOCK sem sellerId
    if ((item.itemType === 'STOCK' || !item.itemType) && !item.sellerId) return true
    return false
  })
}

// Calcular dias úteis
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return result
}

// Calcular atraso em dias (>0 = atrasado, <=0 = no prazo/entregou a tempo)
function calcDelayDays(order: { status: string; deliveryDays: number | null; shippedAt: Date | null; paymentApprovedAt: Date | null; createdAt: Date }, today: Date): number | null {
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return null
  if (!order.deliveryDays) return null
  const base = order.shippedAt ?? order.paymentApprovedAt ?? order.createdAt
  const estimated = addBusinessDays(new Date(base), order.deliveryDays)
  const diffMs = today.getTime() - estimated.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

interface SearchParams {
  status?: string
  search?: string
  origin?: string
  type?: string
}

export default async function AdminPedidosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  // ADMIN vê pedidos que tenham itens da plataforma (ADM) ou DROP
  // Itens STOCK com sellerId são do vendedor e não aparecem aqui
  const allOrders = await prisma.order.findMany({
    where: {
      status: {
        not: 'PENDING'
      }
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              supplierId: true,
              seller: {
                select: {
                  storeName: true
                }
              }
            }
          },
        },
      },
      carne: {
        include: {
          parcelas: {
            select: { id: true, numero: true, valor: true, status: true },
            orderBy: { numero: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const today = new Date()

  // Filtrar pedidos que tenham pelo menos 1 item ADM ou DROP
  // e aplicar filtro de itens via JavaScript
  const rawOrders = allOrders
    .map(order => ({
      ...order,
      items: filterAdmItems(order.items)
    }))
    .filter(order => order.items.length > 0)

  // Agrupar pedidos híbridos pelo parentOrderId
  const groupedOrdersMap = new Map<string, GroupedOrder>()

  for (const order of rawOrders) {
    // Categorizar itens (apenas ADM e DROP, vendedor foi filtrado)
    // - ADM/Plataforma: STOCK sem sellerId
    // - Dropshipping: itemType = DROPSHIPPING
    const hasADM = order.items.some(item => 
      (item.itemType === 'STOCK' || !item.itemType) && !item.sellerId
    )
    const hasDropshipping = order.items.some(item => item.itemType === 'DROPSHIPPING')
    const hasStock = hasADM
    const hasSupplier = order.items.some(item => item.product?.supplierId)
    
    // Para sellers de DROP, buscar pelo produto.seller (nome da loja)
    const sellers = [...new Set(
      order.items
        .filter(item => item.product?.seller && item.itemType === 'DROPSHIPPING')
        .map(item => item.product!.seller!.storeName)
    )]

    // Se tem parentOrderId (é parte de um pedido híbrido)
    if (order.parentOrderId) {
      const key = order.parentOrderId
      
      if (groupedOrdersMap.has(key)) {
        // Adicionar ao grupo existente
        const existing = groupedOrdersMap.get(key)!
        existing.subOrderIds.push(order.id)
        existing.combinedTotal += order.total
        existing.combinedItems.push(...order.items)
        existing.hasDropshipping = existing.hasDropshipping || hasDropshipping
        existing.hasStock = existing.hasStock || hasStock
        existing.hasADM = existing.hasADM || hasADM
        existing.hasSupplier = existing.hasSupplier || hasSupplier
        existing.sellers = [...new Set([...existing.sellers, ...sellers])]
        // Atualizar sentToSupplier (false se qualquer um não foi enviado)
        existing.sentToSupplier = existing.sentToSupplier && order.sentToSupplier
        // Usar status mais prioritário (PROCESSING > SHIPPED > DELIVERED > CANCELLED)
        if (order.status === 'PROCESSING' || existing.status === 'CANCELLED') {
          existing.status = order.status
        }
      } else {
        // Criar novo grupo
        groupedOrdersMap.set(key, {
          id: order.parentOrderId,
          displayId: order.parentOrderId,
          parentOrderId: order.parentOrderId,
          isHybrid: true,
          subOrderIds: [order.id],
          combinedTotal: order.total,
          combinedItems: [...order.items],
          status: order.status,
          sentToSupplier: order.sentToSupplier,
          createdAt: order.createdAt,
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          user: order.user,
          marketplaceOrderId: order.marketplaceOrderId,
          marketplaceName: order.marketplaceName,
          items: order.items,
          hasDropshipping,
          hasStock,
          hasADM,
          hasSupplier,
          sellers,
          deliveryDays: (order as any).deliveryDays ?? null,
          shippedAt: (order as any).shippedAt ?? null,
          paymentApprovedAt: (order as any).paymentApprovedAt ?? null,
          shippingMethod: (order as any).shippingMethod ?? null,
          carne: (order as any).carne ?? null,
        })
      }
    } else {
      // Pedido simples (sem parentOrderId)
      groupedOrdersMap.set(order.id, {
        id: order.id,
        displayId: order.id,
        parentOrderId: null,
        isHybrid: false,
        subOrderIds: [order.id],
        combinedTotal: order.total,
        combinedItems: order.items,
        status: order.status,
        sentToSupplier: order.sentToSupplier,
        createdAt: order.createdAt,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        user: order.user,
        marketplaceOrderId: order.marketplaceOrderId,
        marketplaceName: order.marketplaceName,
        items: order.items,
        hasDropshipping,
        hasStock,
        hasADM,
        hasSupplier,
        sellers,
        deliveryDays: (order as any).deliveryDays ?? null,
        shippedAt: (order as any).shippedAt ?? null,
        paymentApprovedAt: (order as any).paymentApprovedAt ?? null,
        shippingMethod: (order as any).shippingMethod ?? null,
          carne: (order as any).carne ?? null,
  // Converter para array e verificar se realmente é híbrido
  const orders = Array.from(groupedOrdersMap.values()).map(order => {
    // É realmente híbrido se: tem múltiplos tipos de origem (ADM + DROP)
    const typeCount = [order.hasADM, order.hasDropshipping].filter(Boolean).length
    const reallyHybrid = order.subOrderIds.length > 1 || typeCount > 1
    return {
      ...order,
      isHybrid: reallyHybrid,
      items: order.isHybrid ? order.combinedItems : order.items,
      total: order.combinedTotal
    }
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  console.log('[Admin Pedidos] Total de pedidos da ADM:', orders.length, '(agrupados de', rawOrders.length, 'registros)')

  // ── Calcular atraso + conversão para OrderCard ────────────────────────────
  const allCards: OrderCard[] = orders.map(order => {
    const delayDays = calcDelayDays(order as any, today)
    const baseDate = (order as any).shippedAt ?? (order as any).paymentApprovedAt ?? order.createdAt
    const estimated = (order as any).deliveryDays && baseDate
      ? addBusinessDays(new Date(baseDate), (order as any).deliveryDays).toISOString()
      : null
    return {
      id: order.id,
      displayId: order.displayId,
      isHybrid: order.isHybrid,
      subOrderIds: order.subOrderIds,
      total: order.total,
      status: order.status,
      sentToSupplier: order.sentToSupplier,
      createdAt: order.createdAt.toISOString(),
      buyerName: order.buyerName ?? order.user?.name ?? null,
      buyerEmail: order.buyerEmail ?? order.user?.email ?? null,
      marketplaceOrderId: order.marketplaceOrderId,
      marketplaceName: order.marketplaceName,
      itemCount: order.items.length,
      hasDropshipping: order.hasDropshipping,
      hasADM: order.hasADM,
      hasSupplier: order.hasSupplier,
      sellers: order.sellers,
      delayDays,
      estimatedDelivery: estimated,
      shippingMethod: (order as any).shippingMethod ?? null,
      deliveryDays: (order as any).deliveryDays ?? null,
      carne: (order as any).carne ?? null,
    }
  })

  // ── Filtros ───────────────────────────────────────────────────────────────
  const { status: statusParam, search: searchParam, origin: originParam, type: typeParam } = params

  let filtered = allCards

  // status tab
  if (statusParam && statusParam !== 'all') {
    if (statusParam === 'not_sent') {
      filtered = filtered.filter(o => !o.sentToSupplier && o.status !== 'CANCELLED' && o.status !== 'DELIVERED')
    } else if (statusParam === 'late') {
      filtered = filtered.filter(o => (o.delayDays ?? -999) > 0)
    } else {
      filtered = filtered.filter(o => o.status === statusParam.toUpperCase())
    }
  }

  // busca
  if (searchParam) {
    const q = searchParam.toLowerCase()
    filtered = filtered.filter(o =>
      o.buyerName?.toLowerCase().includes(q) ||
      o.buyerEmail?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.marketplaceOrderId?.toLowerCase().includes(q)
    )
  }

  // origem
  if (originParam && originParam !== 'all') {
    if (originParam === 'ml') filtered = filtered.filter(o => !!o.marketplaceOrderId)
    else if (originParam === 'app') filtered = filtered.filter(o => o.marketplaceName === 'APP')
    else filtered = filtered.filter(o => !o.marketplaceOrderId && o.marketplaceName !== 'APP')
  }

  // tipo
  if (typeParam && typeParam !== 'all') {
    if (typeParam === 'hybrid') filtered = filtered.filter(o => o.isHybrid)
    else if (typeParam === 'drop') filtered = filtered.filter(o => o.hasDropshipping && !o.hasADM)
    else if (typeParam === 'adm') filtered = filtered.filter(o => o.hasADM && !o.hasDropshipping)
  }

  // ── Contagens para o filtro ───────────────────────────────────────────────
  const counts = {
    total: allCards.length,
    processing: allCards.filter(o => o.status === 'PROCESSING').length,
    shipped: allCards.filter(o => o.status === 'SHIPPED').length,
    delivered: allCards.filter(o => o.status === 'DELIVERED').length,
    cancelled: allCards.filter(o => o.status === 'CANCELLED').length,
    notSent: allCards.filter(o => !o.sentToSupplier && o.status !== 'CANCELLED' && o.status !== 'DELIVERED').length,
    late: allCards.filter(o => (o.delayDays ?? -999) > 0).length,
  }

  // ── Stats rápidos ─────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total', value: counts.total, icon: <FiShoppingBag size={20} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Processando', value: counts.processing, icon: <FiClock size={20} />, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Enviados', value: counts.shipped, icon: <FiTruck size={20} />, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Entregues', value: counts.delivered, icon: <FiCheckCircle size={20} />, color: 'text-green-600 bg-green-50' },
    { label: 'Não Enviados', value: counts.notSent, icon: <FiAlertCircle size={20} />, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} pedido{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <OrdersFilter counts={counts} />

      {/* Lista */}
      <OrdersCardView orders={filtered} />

      {/* Auto-fetch ML */}
      <AutoFetchOrders />
    </div>
  )
}
