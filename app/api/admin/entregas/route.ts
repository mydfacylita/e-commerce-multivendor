import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'shipped'
    const search = searchParams.get('search') || ''

    // Filtros por status
    let statusFilter: any = {}
    if (status === 'shipped') {
      // Pedidos despachados mas não entregues
      statusFilter = {
        status: 'SHIPPED',
        shippingMethod: 'propria',
        deliveredAt: null
      }
    } else if (status === 'out_for_delivery') {
      // Em rota de entrega (despachados hoje)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      statusFilter = {
        status: 'SHIPPED',
        shippingMethod: 'propria',
        deliveredAt: null,
        shippedAt: { gte: today }
      }
    } else if (status === 'delivered') {
      // Entregues
      statusFilter = {
        status: 'DELIVERED',
        shippingMethod: 'propria'
      }
    } else if (status === 'failed') {
      // Tentativas de entrega falhas (mais de 1 tentativa)
      statusFilter = {
        status: 'SHIPPED',
        shippingMethod: 'propria',
        deliveredAt: null,
        deliveryAttempts: { gte: 1 }
      }
    }

    // Busca por texto
    let searchFilter = {}
    if (search) {
      searchFilter = {
        OR: [
          { id: { contains: search } },
          { buyerName: { contains: search } },
          { buyerPhone: { contains: search } },
          { shippingAddress: { contains: search } }
        ]
      }
    }

    const orders = await prisma.order.findMany({
      where: {
        ...statusFilter,
        ...searchFilter
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        }
      },
      orderBy: [
        { shippedAt: 'asc' } // Mais antigos primeiro (prioridade)
      ],
      take: 100
    })

    // Estatísticas
    const [totalShipped, totalDelivered, totalFailed] = await Promise.all([
      prisma.order.count({
        where: {
          status: 'SHIPPED',
          shippingMethod: 'propria',
          deliveredAt: null
        }
      }),
      prisma.order.count({
        where: {
          status: 'DELIVERED',
          shippingMethod: 'propria',
          deliveredAt: { not: null }
        }
      }),
      prisma.order.count({
        where: {
          status: 'SHIPPED',
          shippingMethod: 'propria',
          deliveredAt: null,
          deliveryAttempts: { gte: 1 }
        }
      })
    ])

    return NextResponse.json({
      orders,
      stats: {
        shipped: totalShipped,
        delivered: totalDelivered,
        failed: totalFailed
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar entregas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
