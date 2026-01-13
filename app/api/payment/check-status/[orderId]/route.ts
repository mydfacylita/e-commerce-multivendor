import { NextRequest, NextResponse } from 'next/server'
import { checkOrderPayment } from '@/lib/payment-sync'

/**
 * GET /api/payment/check-status/[orderId]
 * Verifica o status de um pedido específico usando o sistema unificado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId

    const result = await checkOrderPayment(orderId)

    if (result.status === 'error') {
      return NextResponse.json(
        { error: result.message || 'Erro ao verificar pagamento' },
        { status: result.message === 'Pedido não encontrado' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      orderId,
      status: result.status === 'approved' ? 'PROCESSING' : 'PENDING',
      paymentStatus: result.paymentStatus,
      paid: result.status === 'approved',
      justApproved: result.status === 'approved',
      rejected: result.status === 'rejected',
      message: result.message
    })

  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
