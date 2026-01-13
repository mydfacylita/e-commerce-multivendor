import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  selectedSize: string | null
  selectedColor: string | null
  itemType: string
  refundedAt: Date | null
  product: {
    name: string
    images: string | null
  } | null
}

interface OrderData {
  id: string
  parentOrderId: string | null
  paymentId: string | null
  paymentStatus: string | null
  total: number
  subtotal: number | null
  shippingCost: number | null
  createdAt: Date
  buyerName: string | null
  buyerEmail: string | null
  user: { name: string | null; email: string | null } | null
  items: OrderItem[]
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Buscar pedidos com pagamento aprovado
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: { in: ['approved', 'partial_refunded'] },
        paymentId: { not: null },
        ...(search && {
          OR: [
            { id: { contains: search } },
            { parentOrderId: { contains: search } },
            { paymentId: { contains: search } },
            { buyerName: { contains: search } },
            { buyerEmail: { contains: search } },
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } }
          ]
        })
      },
      select: {
        id: true,
        parentOrderId: true,
        paymentId: true,
        paymentStatus: true,
        total: true,
        subtotal: true,
        shippingCost: true,
        createdAt: true,
        buyerName: true,
        buyerEmail: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            price: true,
            selectedSize: true,
            selectedColor: true,
            itemType: true,
            refundedAt: true,
            product: {
              select: {
                name: true,
                images: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 200
    }) as OrderData[]

    // Agrupar pedidos híbridos (que têm parentOrderId)
    // Pedidos com mesmo parentOrderId devem aparecer como um único pedido
    const groupedOrders: Map<string, OrderData & { 
      isHybrid: boolean
      subOrderIds: string[]
      combinedTotal: number
      combinedItems: OrderItem[]
    }> = new Map()

    for (const order of orders) {
      // Se tem parentOrderId, agrupar
      if (order.parentOrderId) {
        const key = order.parentOrderId
        
        if (groupedOrders.has(key)) {
          // Adicionar itens ao grupo existente
          const existing = groupedOrders.get(key)!
          existing.subOrderIds.push(order.id)
          existing.combinedTotal += order.total
          existing.combinedItems.push(...order.items)
        } else {
          // Criar novo grupo
          groupedOrders.set(key, {
            ...order,
            id: order.parentOrderId, // Usar parentOrderId como ID principal
            isHybrid: true,
            subOrderIds: [order.id],
            combinedTotal: order.total,
            combinedItems: [...order.items]
          })
        }
      } else {
        // Pedido simples
        groupedOrders.set(order.id, {
          ...order,
          isHybrid: false,
          subOrderIds: [order.id],
          combinedTotal: order.total,
          combinedItems: [...order.items]
        })
      }
    }

    // Buscar estornos para todos os pedidos (incluindo sub-pedidos)
    const allOrderIds = orders.map(o => o.id)
    const refunds = await prisma.refund.findMany({
      where: {
        orderId: { in: allOrderIds },
        status: { in: ['approved', 'pending'] }
      },
      select: {
        orderId: true,
        amount: true,
        status: true
      }
    })

    // Agrupar estornos por pedido
    const refundsByOrder: Record<string, number> = {}
    refunds.forEach(r => {
      if (r.status === 'approved') {
        refundsByOrder[r.orderId] = (refundsByOrder[r.orderId] || 0) + r.amount
      }
    })

    // Preparar resposta final
    const ordersWithAvailableRefund = Array.from(groupedOrders.values())
      .map(order => {
        // Calcular total já estornado (somando de todos os sub-pedidos)
        let totalRefunded = 0
        for (const subOrderId of order.subOrderIds) {
          totalRefunded += refundsByOrder[subOrderId] || 0
        }
        
        // Determinar se realmente é híbrido:
        // - Mais de 1 sub-pedido OU
        // - Itens de tipos diferentes (STOCK + DROP)
        const items = order.isHybrid ? order.combinedItems : order.items
        const hasStock = items.some(i => i.itemType === 'STOCK' || !i.itemType)
        const hasDrop = items.some(i => i.itemType === 'DROPSHIPPING')
        const reallyHybrid = order.subOrderIds.length > 1 || (hasStock && hasDrop)

        // Usar combinedTotal para pedidos híbridos
        const orderTotal = order.isHybrid ? order.combinedTotal : order.total
        
        // Contar itens estornados e não estornados
        const refundedItems = items.filter(i => i.refundedAt !== null)
        const availableItems = items.filter(i => i.refundedAt === null)
        const refundedItemsTotal = refundedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
        const availableItemsTotal = availableItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
        
        return {
          id: order.id,
          paymentId: order.paymentId,
          paymentStatus: order.paymentStatus,
          total: orderTotal,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          createdAt: order.createdAt,
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          user: order.user,
          items: order.isHybrid ? order.combinedItems : order.items,
          isHybrid: reallyHybrid,
          subOrderIds: order.subOrderIds,
          totalRefunded,
          availableForRefund: orderTotal - totalRefunded,
          // Novas informações de itens
          refundedItemsCount: refundedItems.length,
          availableItemsCount: availableItems.length,
          refundedItemsTotal,
          availableItemsTotal
        }
      })
      // Filtrar apenas pedidos que têm itens disponíveis para estorno
      .filter(order => order.availableItemsCount > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      orders: ordersWithAvailableRefund
    })
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    )
  }
}
