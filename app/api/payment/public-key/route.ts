import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/payment/public-key
 * Retorna a chave pública do gateway de pagamento para uso no frontend
 */
export async function GET() {
  try {
    const gateway = await prisma.paymentGateway.findFirst({
      where: {
        gateway: 'MERCADOPAGO',
        isActive: true
      }
    })

    if (!gateway) {
      return NextResponse.json(
        { error: 'Gateway de pagamento não configurado' },
        { status: 404 }
      )
    }

    let config = gateway.config
    if (typeof config === 'string') {
      config = JSON.parse(config)
    }

    // Retornar apenas a public key (nunca o access token!)
    return NextResponse.json({
      publicKey: (config as any).publicKey || (config as any).public_key,
      environment: (config as any).environment || 'production'
    })

  } catch (error) {
    console.error('Erro ao buscar public key:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}
