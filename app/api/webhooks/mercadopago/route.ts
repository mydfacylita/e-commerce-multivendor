import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import crypto from 'crypto'

const prisma = new PrismaClient()

/**
 * 🔒 Validar assinatura HMAC do webhook MercadoPago
 */
function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  webhookSecret: string
): boolean {
  if (!xSignature || !xRequestId || !webhookSecret) {
    return false
  }

  try {
    // Parsear x-signature: ts=xxx,v1=yyy
    const parts: Record<string, string> = {}
    xSignature.split(',').forEach(part => {
      const [key, value] = part.split('=')
      if (key && value) parts[key.trim()] = value.trim()
    })

    const ts = parts['ts']
    const v1 = parts['v1']

    if (!ts || !v1) return false

    // Construir manifest conforme documentação MP
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    
    // Gerar HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(manifest)
      .digest('hex')

    // Comparar de forma segura (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(v1),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('[Webhook MP] Erro ao validar assinatura:', error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    // 🔒 Capturar headers de segurança ANTES de ler o body
    const xSignature = request.headers.get('x-signature')
    const xRequestId = request.headers.get('x-request-id')
    
    const body = await request.json()
    
    // 🔒 Log sem dados sensíveis em produção
    if (process.env.NODE_ENV === 'development') {
      console.log('🔔 Webhook Mercado Pago recebido:', body)
    }

    // Mercado Pago envia tipo "payment"
    if (body.type !== 'payment' && body.action !== 'payment.updated' && body.action !== 'payment.created') {
      return NextResponse.json({ received: true })
    }

    const paymentId = body.data?.id
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID missing' }, { status: 400 })
    }

    // 🔒 Buscar configuração do MP para validar assinatura
    const mpConfig = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!mpConfig) {
      console.error('[Webhook MP] Gateway não configurado')
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 })
    }

    const config = JSON.parse(mpConfig.config as string)
    
    // 🔒 Validar assinatura HMAC (se secret configurado)
    if (config.webhookSecret) {
      const isValid = validateWebhookSignature(
        xSignature,
        xRequestId,
        String(paymentId),
        config.webhookSecret
      )
      
      if (!isValid) {
        console.error('[Webhook MP] ❌ Assinatura inválida - possível ataque!')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      console.log('[Webhook MP] ✅ Assinatura válida')
    } else {
      console.warn('[Webhook MP] ⚠️ webhookSecret não configurado - validação desabilitada')
    }

    console.log('💳 Processando pagamento:', paymentId)
    const client = new MercadoPagoConfig({ accessToken: config.accessToken })
    const paymentClient = new Payment(client)

    // Buscar informações do pagamento no MP
    const payment = await paymentClient.get({ id: Number(paymentId) })
    
    console.log('📊 Status do pagamento:', payment.status)

    // Buscar pedido no banco
    const pedido = await prisma.order.findFirst({
      where: { paymentId: String(paymentId) }
    })

    if (!pedido) {
      console.log('⚠️ Pedido não encontrado para payment:', paymentId)
      return NextResponse.json({ received: true })
    }

    console.log('📦 Pedido encontrado:', pedido.id)

    // Atualizar status conforme o pagamento
    if (payment.status === 'approved') {
      console.log('✅ Pagamento aprovado! Verificando antifraude...')
      
      // 🔒 Verificar se precisa passar por análise de fraude
      const needsFraudCheck = pedido.fraudScore !== null && pedido.fraudScore >= 30
      const fraudApproved = pedido.fraudStatus === 'approved'
      
      // Buscar itens do pedido para calcular comissões
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: pedido.id }
      })

      // Atualizar pedido e balance dos vendedores em uma transação
      await prisma.$transaction(async (tx) => {
        // Determinar status do pedido baseado em antifraude
        let orderStatus = pedido.status
        if (needsFraudCheck) {
          if (fraudApproved) {
            orderStatus = 'PROCESSING'
            console.log('✅ Antifraude já aprovado - Liberando para PROCESSING')
          } else {
            orderStatus = 'PENDING'
            console.log('⚠️ Aguardando aprovação do antifraude')
          }
        } else {
          orderStatus = 'PROCESSING'
          console.log('✅ Sem necessidade de análise de fraude - Liberando para PROCESSING')
        }

        // Atualizar pedido
        await tx.order.update({
          where: { id: pedido.id },
          data: { 
            paymentStatus: 'APPROVED',
            status: orderStatus,
            paymentApprovedAt: new Date()
          }
        })

        // Atualizar balance de cada vendedor envolvido
        const sellerBalances = new Map<string, number>()
        
        for (const item of orderItems) {
          if (item.sellerId && item.sellerRevenue) {
            const current = sellerBalances.get(item.sellerId) || 0
            sellerBalances.set(item.sellerId, current + item.sellerRevenue)
          }
        }

        // 💰 Incrementar balance apenas se pedido for para PROCESSING
        // Se está aguardando antifraude, não incrementa ainda
        if (orderStatus === 'PROCESSING') {
          for (const [sellerId, revenue] of sellerBalances.entries()) {
            await tx.seller.update({
              where: { id: sellerId },
              data: {
                balance: { increment: revenue },
                totalEarned: { increment: revenue }
              }
            })
            console.log(`💰 Balance do vendedor ${sellerId.slice(0, 8)} incrementado em R$ ${revenue.toFixed(2)}`)
          }
        } else {
          console.log('⏳ Balance não incrementado - aguardando aprovação antifraude')
        }
      })

      console.log('✅ Pedido atualizado automaticamente!')
      
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      console.log('❌ Pagamento recusado/cancelado')
      
      await prisma.order.update({
        where: { id: pedido.id },
        data: { 
          paymentStatus: payment.status === 'rejected' ? 'FAILED' : 'CANCELLED'
        }
      })
    }

    return NextResponse.json({ 
      received: true, 
      processed: true,
      orderId: pedido.id,
      status: payment.status 
    })

  } catch (error: any) {
    console.error('❌ Erro no webhook MP:', error)
    return NextResponse.json({ 
      error: error.message,
      received: true 
    }, { status: 200 }) // Retorna 200 para não reenviar
  } finally {
    await prisma.$disconnect()
  }
}

// Mercado Pago envia GET para validar
export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'mercadopago' })
}
