import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING'
      },
      select: {
        id: true,
        status: true,
        paymentId: true,
        total: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      total: pendingOrders.length,
      orders: pendingOrders
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
