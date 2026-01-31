import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/admin/financeiro/refund
 * Processa estorno de um pagamento
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { paymentId, orderId, reason } = await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'PaymentId obrigatório' }, { status: 400 })
    }

    // Buscar gateway
    const gateway = await prisma.paymentGateway.findFirst({
      where: {
        gateway: 'MERCADOPAGO',
        isActive: true
      }
    })

    if (!gateway) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 })
    }

    const config = gateway.config as any
    const { accessToken } = config
    const apiUrl = 'https://api.mercadopago.com'

    // Gerar chave de idempotência única (UUID v4)
    const idempotencyKey = `refund-${paymentId}-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Processar estorno no Mercado Pago
    const refundResponse = await fetch(`${apiUrl}/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      }
    })

    if (!refundResponse.ok) {
      const error = await refundResponse.json()
      console.error('Erro ao processar estorno:', error)
      return NextResponse.json({ 
        error: 'Erro ao processar estorno',
        details: error 
      }, { status: refundResponse.status })
    }

    const refundData = await refundResponse.json()

    // Registrar estorno no banco de dados
    const refund = await prisma.refund.create({
      data: {
        orderId: orderId || 'unknown',
        paymentId,
        refundId: String(refundData.id),
        amount: refundData.amount || 0,
        reason: reason || 'Estorno processado',
        gateway: 'MERCADOPAGO',
        status: refundData.status || 'approved',
        processedBy: session.user.email || session.user.name || 'admin'
      }
    })

    console.log('✅ Estorno processado e salvo:', {
      id: refund.id,
      paymentId,
      refundId: refundData.id,
      amount: refundData.amount,
      status: refundData.status
    })

    // Se forneceu orderId, verificar se ainda tem outros pagamentos aprovados
    if (orderId) {
      // Buscar todos os pagamentos deste pedido no Mercado Pago
      const searchUrl = `${apiUrl}/v1/payments/search?external_reference=${orderId}`
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      let hasOtherValidPayment = false
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        const payments = searchData.results || []
        
        // Verificar se tem outro pagamento aprovado (que não seja o que foi estornado)
        hasOtherValidPayment = payments.some((p: any) => 
          p.status === 'approved' && 
          String(p.id) !== String(paymentId)
        )
      }

      // Só cancelar o pedido se NÃO tiver outro pagamento válido
      if (!hasOtherValidPayment) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'refunded',
            status: 'CANCELLED',
            cancelReason: reason || 'Estorno de pagamento'
          }
        })
        console.log('❌ Pedido cancelado (nenhum pagamento válido restante)')
      } else {
        console.log('✅ Pedido mantido (ainda existe pagamento válido)')
      }
    }

    return NextResponse.json({
      success: true,
      refundId: refundData.id,
      amount: refundData.amount,
      status: refundData.status,
      message: 'Estorno processado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao processar estorno:', error)
    return NextResponse.json(
      { error: 'Erro ao processar estorno', details: String(error) },
      { status: 500 }
    )
  }
}
