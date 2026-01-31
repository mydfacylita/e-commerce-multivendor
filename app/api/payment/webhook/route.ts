import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentService } from '@/lib/payment'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/payment/webhook
 * Webhook unificado para receber notificações de pagamento
 * Todos os gateways devem apontar para esta URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const gateway = request.headers.get('x-gateway') || 'MERCADOPAGO'

    console.log('🔔 Webhook recebido:', {
      gateway,
      body: JSON.stringify(body).substring(0, 200)
    })

    // Processar conforme o gateway
    switch (gateway.toUpperCase()) {
      case 'MERCADOPAGO':
        return await handleMercadoPago(body)
      
      case 'PAGSEGURO':
        return await handlePagSeguro(body)
      
      case 'STRIPE':
        return await handleStripe(body)
      
      default:
        console.warn('Gateway desconhecido:', gateway)
        return NextResponse.json({ received: true })
    }

  } catch (error) {
    console.error('Erro no webhook:', error)
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 })
  }
}

/**
 * Processa webhook do Mercado Pago
 */
async function handleMercadoPago(data: any) {
  try {
    // Mercado Pago envia notificação de payment
    if (data.type === 'payment') {
      const paymentId = data.data?.id
      
      if (!paymentId) {
        return NextResponse.json({ received: true })
      }

      // Buscar status do pagamento
      const paymentStatus = await PaymentService.checkPaymentStatus(
        paymentId.toString(),
        'MERCADOPAGO'
      )

      console.log('💰 Status do pagamento:', {
        paymentId,
        status: paymentStatus.status,
        paid: paymentStatus.paid
      })

      // Se foi aprovado, processar
      if (paymentStatus.paid) {
        await processApprovedPayment(paymentId.toString(), 'MERCADOPAGO', data)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erro ao processar webhook Mercado Pago:', error)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}

/**
 * Processa webhook do PagSeguro
 */
async function handlePagSeguro(data: any) {
  // TODO: Implementar
  return NextResponse.json({ received: true })
}

/**
 * Processa webhook do Stripe
 */
async function handleStripe(data: any) {
  // TODO: Implementar
  return NextResponse.json({ received: true })
}

/**
 * Processa pagamento aprovado
 */
async function processApprovedPayment(
  paymentId: string,
  gateway: string,
  data: any
) {
  try {
    const externalReference = data.external_reference
    const metadata = data.metadata

    console.log('✅ Processando pagamento aprovado:', {
      paymentId,
      externalReference,
      metadata
    })

    // TODO: Processar baseado no tipo
    // - Se for SUBSCRIPTION -> ativar subscription
    // - Se for ORDER -> confirmar pedido
    // - etc

    // Por enquanto, apenas log
    if (metadata?.type === 'SUBSCRIPTION') {
      // Ativar subscription
      if (metadata.referenceId) {
        await prisma.subscription.update({
          where: { id: metadata.referenceId },
          data: { status: 'ACTIVE' }
        })
        console.log('✅ Subscription ativada:', metadata.referenceId)
      }
    }

  } catch (error) {
    console.error('Erro ao processar pagamento aprovado:', error)
  }
}

/**
 * GET /api/payment/webhook
 * Alguns gateways fazem verificação via GET
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook endpoint ativo' 
  })
}
