import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  // 🚫 BLOQUEAR EM PRODUÇÃO
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 🔐 Verificar autenticação admin
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
