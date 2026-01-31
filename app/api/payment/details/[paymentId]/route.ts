import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/payment/details/[paymentId]
 * Retorna todos os detalhes do pagamento do Mercado Pago
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const paymentId = params.paymentId

    // Buscar gateway ativo do Mercado Pago
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

    // Buscar detalhes completos do pagamento
    const response = await fetch(`${apiUrl}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ 
        error: 'Erro ao buscar pagamento',
        details: error 
      }, { status: response.status })
    }

    const paymentData = await response.json()

    // Buscar pedido relacionado no banco
    const order = await prisma.order.findFirst({
      where: {
        paymentId: paymentId
      },
      select: {
        id: true,
        status: true,
        total: true,
        paymentStatus: true,
        paymentApprovedAt: true,
        createdAt: true,
        buyerEmail: true,
        buyerName: true
      }
    })

    return NextResponse.json({
      success: true,
      paymentData, // Todos os dados do Mercado Pago
      orderData: order, // Dados do pedido no nosso banco
      summary: {
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        transaction_amount: paymentData.transaction_amount,
        currency_id: paymentData.currency_id,
        payment_method_id: paymentData.payment_method_id,
        payment_type_id: paymentData.payment_type_id,
        date_created: paymentData.date_created,
        date_approved: paymentData.date_approved,
        date_last_updated: paymentData.date_last_updated,
        payer_email: paymentData.payer?.email,
        external_reference: paymentData.external_reference,
        description: paymentData.description
      }
    })

  } catch (error) {
    console.error('Erro ao buscar detalhes do pagamento:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição', details: String(error) },
      { status: 500 }
    )
  }
}
