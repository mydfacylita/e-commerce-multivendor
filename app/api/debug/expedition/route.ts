import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
        NOT: {
          OR: [
            { shippingCarrier: { contains: 'CAINIAO' } },
            { shippingCarrier: { contains: 'ALIEXPRESS' } },
            { shippingMethod: { contains: 'ALIEXPRESS' } },
            { shippingMethod: { contains: 'CAINIAO' } }
          ]
        }
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
