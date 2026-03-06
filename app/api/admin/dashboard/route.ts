import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // ===== KPIs PARALELOS =====
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      totalUsers,
      totalSellers,
      activeSellers,
      pendingSellers,

      // Receita mês atual vs mês anterior
      revenueThisMonth,
      revenueLastMonth,

      // Pedidos mês atual vs mês anterior
      ordersThisMonth,
      ordersLastMonth,

      // Pedidos hoje
      ordersToday,

      // Receita total
      totalRevenue,

      // Pedidos por status
      ordersByStatus,

      // Novos usuários esta semana
      newUsersThisWeek,

      // Pedidos pendentes (ação necessária)
      pendingOrders,
      processingOrders,

      // Assinaturas ativas
      activeSubscriptions,
      expiredSubscriptions,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.order.count(),
      prisma.user.count(),
      prisma.seller.count(),
      prisma.seller.count({ where: { status: 'ACTIVE' } }),
      prisma.seller.count({ where: { status: 'PENDING' } }),

      // Receita
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),

      // Pedidos
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),

      // Hoje
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),

      // Total geral
      prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),

      // Por status (todos)
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Novos usuários 7 dias
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      // Pendentes/processando
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),

      // Assinaturas
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'EXPIRED' } }),
    ])

    // ===== RECEITA DOS ÚLTIMOS 30 DIAS (agrupado por dia) =====
    const recentOrders30 = await prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'CANCELLED' },
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    })

    // Agrupar por dia
    const revenueByDayMap: Record<string, number> = {}
    const ordersCountByDayMap: Record<string, number> = {}
    recentOrders30.forEach(order => {
      const day = order.createdAt.toISOString().slice(0, 10)
      revenueByDayMap[day] = (revenueByDayMap[day] || 0) + order.total
      ordersCountByDayMap[day] = (ordersCountByDayMap[day] || 0) + 1
    })

    // Garantir todos os 30 dias (mesmo sem pedidos)
    const revenueByDay = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      revenueByDay.push({
        date: key,
        label,
        receita: Math.round((revenueByDayMap[key] || 0) * 100) / 100,
        pedidos: ordersCountByDayMap[key] || 0,
      })
    }

    // ===== TOP 5 PRODUTOS MAIS VENDIDOS =====
    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, price: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const topProductIds = topProductsRaw.map(p => p.productId)
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, price: true, images: true },
    })

    const topProducts = topProductsRaw
      .map(p => {
        const detail = topProductDetails.find(d => d.id === p.productId)
        return {
          id: p.productId,
          name: detail?.name?.slice(0, 40) || 'Produto removido',
          vendas: p._count.id,
          receita: Math.round((p._sum.price || 0) * 100) / 100,
        }
      })
      .slice(0, 5)

    // ===== TOP 5 VENDEDORES POR RECEITA =====
    const topSellersRaw = await prisma.order.groupBy({
      by: ['sellerId'],
      where: {
        sellerId: { not: null },
        status: { not: 'CANCELLED' },
      },
      _sum: { total: true, commissionAmount: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    })

    const topSellerIds = topSellersRaw.map(s => s.sellerId).filter(Boolean) as string[]
    const topSellerDetails = await prisma.seller.findMany({
      where: { id: { in: topSellerIds } },
      select: { id: true, storeName: true, status: true },
    })

    const topSellers = topSellersRaw.map(s => {
      const detail = topSellerDetails.find(d => d.id === s.sellerId)
      return {
        id: s.sellerId,
        nome: detail?.storeName?.slice(0, 25) || 'Loja removida',
        receita: Math.round((s._sum.total || 0) * 100) / 100,
        pedidos: s._count.id,
        comissao: Math.round((s._sum.commissionAmount || 0) * 100) / 100,
      }
    })

    // ===== MÉTODOS DE PAGAMENTO =====
    const paymentMethodsRaw = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where: { status: { not: 'CANCELLED' } },
      _count: { id: true },
      _sum: { total: true },
    })
    const paymentMethods = paymentMethodsRaw
      .filter(p => p.paymentMethod)
      .map(p => ({
        method: p.paymentMethod || 'Desconhecido',
        count: p._count.id,
        total: Math.round((p._sum.total || 0) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // ===== PEDIDOS RECENTES =====
    const recentOrders = await prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        buyerName: true,
        total: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    })

    // ===== VARIAÇÕES =====
    const revThisM = revenueThisMonth._sum.total || 0
    const revLastM = revenueLastMonth._sum.total || 0
    const revChange = revLastM > 0 ? ((revThisM - revLastM) / revLastM) * 100 : 0

    const ordThisM = ordersThisMonth
    const ordLastM = ordersLastMonth
    const ordChange = ordLastM > 0 ? ((ordThisM - ordLastM) / ordLastM) * 100 : 0

    return NextResponse.json({
      kpis: {
        totalProducts,
        activeProducts,
        totalOrders,
        totalUsers,
        totalSellers,
        activeSellers,
        pendingSellers,
        totalRevenue: Math.round((totalRevenue._sum.total || 0) * 100) / 100,
        revenueThisMonth: Math.round(revThisM * 100) / 100,
        revenueLastMonth: Math.round(revLastM * 100) / 100,
        revenueChange: Math.round(revChange * 10) / 10,
        ordersThisMonth: ordThisM,
        ordersLastMonth: ordLastM,
        ordersChange: Math.round(ordChange * 10) / 10,
        ordersToday,
        pendingOrders,
        processingOrders,
        newUsersThisWeek,
        activeSubscriptions,
        expiredSubscriptions,
      },
      ordersByStatus: ordersByStatus.map(s => ({
        status: s.status,
        count: s._count.id,
      })),
      revenueByDay,
      topProducts,
      topSellers,
      paymentMethods,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        buyerName: o.buyerName || o.user?.name || 'Cliente',
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}
