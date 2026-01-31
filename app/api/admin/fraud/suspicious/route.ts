import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'

    // Montar filtro
    const where: any = {
      fraudScore: { gte: 30 } // Score >= 30 (médio ou maior)
    }

    if (status === 'pending') {
      where.fraudStatus = 'pending'
    } else if (status === 'investigating') {
      where.fraudStatus = 'investigating'
    } else if (status !== 'all') {
      where.fraudStatus = status
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        buyerName: true,
        buyerEmail: true,
        buyerCpf: true,
        buyerPhone: true,
        total: true,
        fraudScore: true,
        fraudReasons: true,
        fraudStatus: true,
        fraudCheckedAt: true,
        fraudCheckedBy: true,
        createdAt: true,
        ipAddress: true,
        shippingAddress: true,
        paymentMethod: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            orders: {
              select: { id: true }
            }
          }
        }
      },
      orderBy: [
        { fraudScore: 'desc' }, // Maior risco primeiro
        { createdAt: 'desc' }
      ]
    })

    // Parsear JSON dos motivos
    const ordersWithReasons = orders.map(order => ({
      ...order,
      fraudReasons: order.fraudReasons ? JSON.parse(order.fraudReasons) : []
    }))

    return NextResponse.json({
      orders: ordersWithReasons,
      total: ordersWithReasons.length
    })
  } catch (error) {
    console.error('Erro ao buscar pedidos suspeitos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
