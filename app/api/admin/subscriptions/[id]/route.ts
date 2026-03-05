import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/subscriptions/[id]
 * Retorna detalhes do contrato + consumo do mês
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: {
        plan: true,
        seller: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          }
        }
      }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const sellerId = subscription.sellerId
    const start = new Date(subscription.startDate)
    const end = new Date(subscription.endDate)

    // Início e fim do mês atual
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // --- Consumo total no período do contrato ---
    const [
      totalProducts,
      totalOrdersContract,
      revenueContractRaw,
      // Consumo no mês atual
      ordersThisMonth,
      revenueThisMonthRaw,
      // Produtos ativos agora
      activeProducts,
      // Últimos 5 pedidos
      recentOrders,
      // Histórico de assinaturas do vendedor
      allSubscriptions,
    ] = await Promise.all([
      prisma.product.count({ where: { sellerId } }),

      prisma.order.count({
        where: {
          sellerId,
          createdAt: { gte: start, lte: end },
          status: { not: 'CANCELLED' }
        }
      }),

      prisma.order.aggregate({
        where: {
          sellerId,
          createdAt: { gte: start, lte: end },
          status: { not: 'CANCELLED' }
        },
        _sum: { total: true }
      }),

      prisma.order.count({
        where: {
          sellerId,
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { not: 'CANCELLED' }
        }
      }),

      prisma.order.aggregate({
        where: {
          sellerId,
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { not: 'CANCELLED' }
        },
        _sum: { total: true }
      }),

      prisma.product.count({ where: { sellerId, active: true } }),

      prisma.order.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          buyerName: true,
          user: { select: { name: true } }
        }
      }),

      prisma.subscription.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { name: true } } }
      }),
    ])

    const revenueContract = revenueContractRaw._sum.total ?? 0
    const revenueThisMonth = revenueThisMonthRaw._sum.total ?? 0
    const commission = subscription.plan.platformCommission ?? 10
    const commissionEarned = (revenueContract * commission) / 100
    const commissionThisMonth = (revenueThisMonth * commission) / 100

    // Porcentagem de uso dos limites do plano
    const usage = {
      products: {
        current: totalProducts,
        limit: subscription.plan.maxProducts ?? null,
        pct: subscription.plan.maxProducts
          ? Math.min(100, Math.round((totalProducts / subscription.plan.maxProducts) * 100))
          : null
      },
      orders: {
        current: totalOrdersContract,
        limit: subscription.plan.maxOrders ?? null,
        pct: subscription.plan.maxOrders
          ? Math.min(100, Math.round((totalOrdersContract / subscription.plan.maxOrders) * 100))
          : null
      },
      revenue: {
        current: revenueContract,
        limit: subscription.plan.maxRevenue ?? null,
        pct: subscription.plan.maxRevenue
          ? Math.min(100, Math.round((revenueContract / subscription.plan.maxRevenue) * 100))
          : null
      }
    }

    return NextResponse.json({
      subscription,
      consumo: {
        totalProducts,
        activeProducts,
        totalOrdersContract,
        revenueContract,
        commissionEarned,
        ordersThisMonth,
        revenueThisMonth,
        commissionThisMonth,
      },
      usage,
      recentOrders,
      allSubscriptions,
    })
  } catch (error) {
    console.error('Erro ao buscar detalhes do contrato:', error)
    return NextResponse.json({ error: 'Erro ao buscar detalhes' }, { status: 500 })
  }
}
