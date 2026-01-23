import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiEye, FiPackage, FiAlertCircle, FiLayers } from 'react-icons/fi'
import UpdateOrderStatusButton from '@/components/admin/UpdateOrderStatusButton'
import SendToSupplierButton from '@/components/admin/SendToSupplierButton'
import PrintShippingLabelButton from '@/components/admin/PrintShippingLabelButton'
import AutoFetchOrders from '@/components/admin/AutoFetchOrders'
import { formatOrderNumber } from '@/lib/order'

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

export default async function AdminPedidosPage() {
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
    },
    orderBy: { createdAt: 'desc' },
  })

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
          sellers
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
        sellers
      })
    }
  }

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

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      PENDING: 'bg-gray-100 text-gray-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      SHIPPED: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado',
    }
    return statusMap[status] || status
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Gerenciar Pedidos</h1>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total de Pedidos</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <p className="text-sm text-gray-600">Processando</p>
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => o.status === 'PROCESSING').length}
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <p className="text-sm text-gray-600">Não Enviados</p>
            <p className="text-2xl font-bold text-red-600">
              {orders.filter(o => !o.sentToSupplier && o.status !== 'CANCELLED').length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-6 font-semibold">ID</th>
                <th className="text-left py-4 px-6 font-semibold">Origem</th>
                <th className="text-left py-4 px-6 font-semibold">Tipo</th>
                <th className="text-left py-4 px-6 font-semibold">Vendedor</th>
                <th className="text-left py-4 px-6 font-semibold">Cliente</th>
                <th className="text-left py-4 px-6 font-semibold">Total</th>
                <th className="text-left py-4 px-6 font-semibold">Itens</th>
                <th className="text-left py-4 px-6 font-semibold">Status</th>
                <th className="text-left py-4 px-6 font-semibold">Fornecedor</th>
                <th className="text-left py-4 px-6 font-semibold">Data</th>
                <th className="text-right py-4 px-6 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                return (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <p className="font-mono text-sm font-semibold text-primary-600">
                        {formatOrderNumber(order.isHybrid ? order.displayId : order.id)}
                      </p>
                      {order.isHybrid && (
                        <div className="flex items-center gap-1">
                          <FiLayers className="text-purple-600" size={12} />
                          <span className="text-xs text-purple-600">{order.subOrderIds.length} sub-pedidos</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {order.marketplaceOrderId ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        ML
                      </span>
                    ) : order.marketplaceName === 'APP' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        📱 APP
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        Site
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {order.isHybrid ? (
                      <div className="flex flex-col gap-1">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                          🔄 Híbrido
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {[
                            order.hasADM ? 'AD' : null,
                            order.hasDropshipping ? 'DR' : null
                          ].filter(Boolean).join('/')}
                        </span>
                      </div>
                    ) : order.hasDropshipping ? (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                        📦 DROP
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                        🏪 ADM
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      {/* Mostrar Plataforma se tem itens ADM */}
                      {order.hasADM && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          🏢 Plataforma
                        </span>
                      )}
                      {/* Mostrar vendedores DROP se existirem */}
                      {order.sellers.length > 0 && order.sellers.map((seller, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                          👤 {seller}
                        </span>
                      ))}
                      {/* Se não tem ADM nem vendedores, é só DROP */}
                      {!order.hasADM && order.sellers.length === 0 && order.hasDropshipping && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                          📦 Fornecedor DROP
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-semibold">{order.buyerName || order.user?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{order.buyerEmail || order.user?.email || 'N/A'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-semibold text-primary-600">
                      R$ {order.total.toFixed(2)}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm">{order.items.length} produtos</p>
                  </td>
                  <td className="py-4 px-6">
                    {order.status !== 'CANCELLED' ? (
                      order.isHybrid ? (
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      ) : (
                        <UpdateOrderStatusButton orderId={order.id} currentStatus={order.status} />
                      )
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                        ❌ Cancelado
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {order.sentToSupplier ? (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <FiPackage size={16} />
                        <span>Enviado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <FiAlertCircle size={16} />
                        <span>Pendente</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-end gap-2">
                      {order.marketplaceOrderId && order.status !== 'CANCELLED' && !order.isHybrid && (
                        <PrintShippingLabelButton 
                          orderId={order.subOrderIds[0]}
                          marketplace="mercadolivre"
                        />
                      )}
                      {/* Só mostra botão se: pedido tem fornecedor E não foi enviado E status válido */}
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
                      {order.isHybrid ? (
                        <Link
                          href={`/admin/pedidos/${order.subOrderIds[0]}`}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-md flex items-center gap-1"
                          title="Ver detalhes do pedido híbrido"
                        >
                          <FiLayers size={16} />
                          <FiEye size={18} />
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                          title="Ver detalhes"
                        >
                          <FiEye size={18} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum pedido encontrado</p>
          </div>
        )}
      </div>

      {/* Componente de verificação automática */}
      <AutoFetchOrders />
    </div>
  )
}
