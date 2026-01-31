import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const days = 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - days)

    // Buscar pedidos do período atual
    const currentOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Buscar pedidos do período anterior
    const previousOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    })

    // Buscar clientes únicos do período
    const customers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        role: 'USER'
      }
    })

    // Métricas principais
    const totalRevenue = currentOrders.reduce((sum, order) => sum + order.total, 0)
    const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total, 0)
    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    const totalOrders = currentOrders.length
    const previousOrdersCount = previousOrders.length
    const ordersGrowth = previousOrdersCount > 0
      ? ((totalOrders - previousOrdersCount) / previousOrdersCount) * 100
      : 0

    const totalCustomers = customers.length
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Receita por dia
    const revenueByDay: { date: string; value: number }[] = []
    const dayMap = new Map<string, number>()

    currentOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0]
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + order.total)
    })

    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - i - 1))
      const dateKey = date.toISOString().split('T')[0]
      revenueByDay.push({
        date: dateKey,
        value: dayMap.get(dateKey) || 0
      })
    }

    // Pedidos por status
    const statusMap = new Map<string, number>()
    const statusColors: Record<string, string> = {
      PENDING: '#FFA500',
      PROCESSING: '#4169E1',
      SHIPPED: '#9370DB',
      DELIVERED: '#32CD32',
      CANCELLED: '#DC143C'
    }

    const statusLabels: Record<string, string> = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado'
    }

    currentOrders.forEach(order => {
      statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1)
    })

    const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status: statusLabels[status] || status,
      count,
      color: statusColors[status] || '#808080'
    }))

    // Top 5 produtos mais vendidos
    const productSalesMap = new Map<string, { name: string; sales: number; revenue: number }>()

    currentOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.product) return
        
        const existing = productSalesMap.get(item.productId) || {
          name: item.product.name,
          sales: 0,
          revenue: 0
        }
        
        existing.sales += item.quantity
        existing.revenue += item.price * item.quantity
        productSalesMap.set(item.productId, existing)
      })
    })

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageTicket,
      revenueGrowth,
      ordersGrowth,
      revenueByDay,
      ordersByStatus,
      topProducts
    })
  } catch (error) {
    console.error('Erro ao buscar dados de vendas:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar dados' },
      { status: 500 }
    )
  }
}
