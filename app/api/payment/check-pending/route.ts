import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentService } from '@/lib/payment'

/**
 * POST /api/payment/check-pending
 * Verifica o status de todos os pedidos pendentes e atualiza se foram pagos
 */
export async function POST(request: NextRequest) {
  try {
    // Buscar todos os pedidos com status PENDING
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentId: {
          not: null
        }
      },
      select: {
        id: true,
        paymentId: true,
        total: true,
        createdAt: true
      }
    })

    console.log(`🔍 Verificando ${pendingOrders.length} pedidos pendentes...`)

    const results = {
      checked: 0,
      approved: 0,
      stillPending: 0,
      errors: 0
    }

    // Verificar cada pedido
    for (const order of pendingOrders) {
      try {
        results.checked++

        if (!order.paymentId) continue

        // Verificar status do pagamento no Mercado Pago
        const paymentStatus = await PaymentService.checkPaymentStatus(
          order.paymentId,
          'MERCADOPAGO'
        )

        if (paymentStatus.paid && paymentStatus.status === 'approved') {
          // Atualizar pedido para PROCESSING
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'PROCESSING',
              paymentStatus: 'approved',
              paymentApprovedAt: new Date()
            }
          })

          console.log(`✅ Pedido ${order.id} aprovado!`)
          results.approved++
        } else {
          console.log(`⏳ Pedido ${order.id} ainda pendente (status: ${paymentStatus.status})`)
          results.stillPending++
        }
      } catch (error) {
        console.error(`❌ Erro ao verificar pedido ${order.id}:`, error)
        results.errors++
      }
    }

    console.log(`✅ Verificação concluída:`, results)

    return NextResponse.json({
      success: true,
      message: 'Verificação de pagamentos concluída',
      results
    })

  } catch (error) {
    console.error('Erro ao verificar pagamentos pendentes:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar pagamentos' },
      { status: 500 }
    )
  }
}
