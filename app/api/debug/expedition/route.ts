import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // 🚫 BLOQUEAR EM PRODUÇÃO
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 🔐 Verificar autenticação admin
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // Buscar todos os pedidos PROCESSING
    const processingOrders = await prisma.order.findMany({
      where: { status: 'PROCESSING' },
      select: {
        id: true,
        buyerName: true,
        status: true,
        shippingMethod: true,
        shippingCarrier: true,
        separatedAt: true,
        packedAt: true,
        shippedAt: true
      },
      take: 20
    })
    
    // Simular o filtro da API de expedição (pending - próprios)
    const expeditionOrders = await prisma.order.findMany({
      where: {
        status: 'PROCESSING',
        separatedAt: null,
        // Excluir pedidos internacionais
        AND: [
          { OR: [{ shippingMethod: null }, { shippingMethod: { not: 'international' } }] },
          { OR: [{ shippingCarrier: null }, { shippingCarrier: { not: 'Importação Direta' } }] }
        ]
      },
      select: {
        id: true,
        buyerName: true,
        status: true,
        shippingMethod: true,
        shippingCarrier: true
      }
    })
    
    // Buscar todos os pedidos para debug
    const allOrders = await prisma.order.findMany({
      where: {
        status: { in: ['PROCESSING', 'PENDING', 'SHIPPED'] }
      },
      select: {
        id: true,
        buyerName: true,
        status: true,
        shippingMethod: true,
        shippingCarrier: true,
        separatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    })
    
    return NextResponse.json({
      processingOrders,
      expeditionOrders,
      allOrders
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
