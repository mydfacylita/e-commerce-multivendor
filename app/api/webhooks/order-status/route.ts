import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAffiliateCommission, cancelAffiliateCommission } from '@/lib/affiliate-commission'

/**
 * Webhook genérico para notificações de status de pedido
 * Pode ser usado por Mercado Pago, Stripe, Correios, etc.
 * 
 * POST /api/webhooks/order-status
 * Body: {
 *   orderId: string,
 *   status: 'DELIVERED' | 'CANCELLED' | 'PROCESSING' | 'SHIPPED',
 *   source: string (opcional - ex: 'mercadopago', 'correios'),
 *   metadata: object (opcional - dados extras)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, status, source = 'webhook', metadata = {} } = body

    console.log('🔔 [WEBHOOK] Notificação recebida:', {
      orderId,
      status,
      source,
      metadata
    })

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId e status são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar status
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        affiliateId: true,
        affiliateCode: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Se status não mudou, não fazer nada
    if (order.status === status) {
      console.log('   ℹ️ Status já é', status, '- nenhuma ação necessária')
      return NextResponse.json({
        message: 'Status já atualizado',
        affiliate: null
      })
    }

    // Atualizar status do pedido
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date()
      }
    })

    console.log('   ✅ Status atualizado:', order.status, '→', status)

    // Processar comissão de afiliado se aplicável
    let affiliateResult = null

    if (status === 'DELIVERED' && order.affiliateId) {
      console.log('   🎯 Pedido tem afiliado - processando comissão...')
      affiliateResult = await processAffiliateCommission(orderId)
    } else if (status === 'CANCELLED' && order.affiliateId) {
      console.log('   🎯 Pedido cancelado - estornando comissão...')
      affiliateResult = await cancelAffiliateCommission(orderId)
    }

    return NextResponse.json({
      message: 'Status atualizado com sucesso',
      orderId,
      oldStatus: order.status,
      newStatus: status,
      source,
      affiliate: affiliateResult
    })
  } catch (error: any) {
    console.error('❌ [WEBHOOK] Erro ao processar:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

/**
 * GET para testar o webhook
 */
export async function GET() {
  return NextResponse.json({
    service: 'Order Status Webhook',
    status: 'online',
    usage: {
      method: 'POST',
      endpoint: '/api/webhooks/order-status',
      body: {
        orderId: 'string (required)',
        status: 'DELIVERED | CANCELLED | PROCESSING | SHIPPED (required)',
        source: 'string (optional - ex: mercadopago, correios)',
        metadata: 'object (optional)'
      },
      example: {
        orderId: 'ca11ye041...',
        status: 'DELIVERED',
        source: 'correios',
        metadata: {
          trackingCode: 'BR123456789BR',
          deliveredAt: '2026-01-01T10:00:00Z'
        }
      }
    }
  })
}
