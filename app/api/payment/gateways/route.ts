import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/payment/gateways
 * Lista gateways de pagamento ativos
 */
export async function GET(request: NextRequest) {
  try {
    const gateways = await prisma.paymentGateway.findMany({
      where: { isActive: true },
      select: {
        gateway: true,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ gateways })
  } catch (error) {
    console.error('Erro ao buscar gateways:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar formas de pagamento' },
      { status: 500 }
    )
  }
}
