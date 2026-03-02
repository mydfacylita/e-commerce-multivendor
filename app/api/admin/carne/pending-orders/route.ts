import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [orders, carnes] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: { not: 'CANCELLED' },
          paymentStatus: { in: ['PENDING', 'FAILED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          total: true,
          buyerName: true,
          buyerEmail: true,
          buyerPhone: true,
          buyerCpf: true,
          paymentMethod: true,
          paymentStatus: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              price: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
      // Get all order IDs that already have a carnê
      prisma.$queryRaw<{ orderId: string }[]>`SELECT orderId FROM carne`,
    ])

    const carneOrderIds = new Set(carnes.map(c => c.orderId))

    const result = orders.map(o => ({
      id: o.id,
      total: o.total,
      buyerName: o.buyerName,
      buyerEmail: o.buyerEmail,
      buyerPhone: o.buyerPhone,
      buyerCpf: o.buyerCpf,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
      hasCarne: carneOrderIds.has(o.id),
      items: o.items,
    }))

    return NextResponse.json({ orders: result })
  } catch (error) {
    console.error('[CARNE pending-orders GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
