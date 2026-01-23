import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

/**
 * POST /api/payment/create-card
 * Processa pagamento com cartão de crédito
 * Gera token do cartão server-side e processa pagamento
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions)
    let userId: string | null = session?.user?.id || null
    let userEmail: string | null = session?.user?.email || null
    
    // Tenta autenticação via JWT (app mobile)
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email?: string }
          userId = decoded.sub
          userEmail = decoded.email || null
        } catch (jwtError) {
          console.error('❌ JWT inválido:', jwtError)
        }
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      amount,
      description,
      type,
      referenceId,
      paymentMethod,
      installments = 1,
      card
    } = body

    // Validações
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    if (!card || !card.number || !card.holderName || !card.expiryMonth || !card.expiryYear || !card.cvv) {
      return NextResponse.json({ error: 'Dados do cartão incompletos' }, { status: 400 })
    }

    // Buscar gateway ativo
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!gateway) {
      return NextResponse.json({ error: 'Gateway de pagamento não configurado' }, { status: 500 })
    }

    let config = gateway.config as any
    if (typeof config === 'string') {
      config = JSON.parse(config)
    }

    const accessToken = config.accessToken
    const publicKey = config.publicKey

    if (!accessToken) {
      return NextResponse.json({ error: 'Gateway não configurado corretamente' }, { status: 500 })
    }

    // Buscar dados completos do comprador do pedido (ajuda antifraude)
    let payerName = card.holderName
    let payerDocument = card.cpf
    let payerPhone: string | null = null
    let payerAddress: any = null
    
    if (type === 'ORDER' && referenceId) {
      const order = await prisma.order.findUnique({
        where: { id: referenceId },
        select: { 
          buyerName: true, 
          buyerCpf: true, 
          buyerEmail: true,
          buyerPhone: true,
          shippingAddress: true
        }
      })
      if (order) {
        payerName = order.buyerName || payerName
        payerDocument = order.buyerCpf || payerDocument
        userEmail = order.buyerEmail || userEmail
        payerPhone = order.buyerPhone || null
        
        // Tentar parsear endereço
        if (order.shippingAddress) {
          try {
            const addr = JSON.parse(order.shippingAddress)
            if (addr.zipCode) {
              payerAddress = {
                zip_code: addr.zipCode.replace(/\D/g, ''),
                street_name: addr.street || 'Rua',
                street_number: parseInt(addr.number) || 1,
                neighborhood: addr.neighborhood || 'Centro',
                city: addr.city || '',
                federal_unit: addr.state || ''
              }
            }
          } catch (e) {
            // Endereço não é JSON
          }
        }
      }
    }

    console.log('💳 [CARTÃO] Processando pagamento')

    // 1. Criar token do cartão via API do Mercado Pago
    const tokenResponse = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        card_number: card.number,
        cardholder: {
          name: card.holderName,
          identification: {
            type: 'CPF',
            number: payerDocument?.replace(/\D/g, '') || ''
          }
        },
        expiration_month: parseInt(card.expiryMonth),
        expiration_year: parseInt(card.expiryYear),
        security_code: card.cvv
      })
    })

    const tokenResult = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenResult.id) {
      console.error('❌ Erro ao criar token')
      return NextResponse.json({ 
        error: 'Erro nos dados do cartão. Verifique e tente novamente.',
        status: 'rejected',
        statusDetail: tokenResult.cause?.[0]?.code || 'token_error'
      }, { status: 400 })
    }

    console.log('✅ Token criado')

    // 3. Criar pagamento - NÃO enviar payment_method_id, deixar MP detectar
    const nameParts = payerName.split(' ')
    const firstName = nameParts[0] || 'Cliente'
    const lastName = nameParts.slice(1).join(' ') || 'User'

    // Arredondar valor para 2 casas decimais (Mercado Pago exige)
    const transactionAmount = Math.round(amount * 100) / 100

    // Montar payer com dados completos (ajuda aprovação antifraude)
    const payer: any = {
      email: userEmail,
      first_name: firstName,
      last_name: lastName,
      identification: {
        type: 'CPF',
        number: payerDocument?.replace(/\D/g, '') || ''
      }
    }

    // Adicionar telefone se disponível
    if (payerPhone) {
      const phoneClean = payerPhone.replace(/\D/g, '')
      payer.phone = {
        area_code: phoneClean.substring(0, 2),
        number: phoneClean.substring(2)
      }
    }

    // Adicionar endereço se disponível
    if (payerAddress) {
      payer.address = payerAddress
    }

    const paymentData: any = {
      transaction_amount: transactionAmount,
      token: tokenResult.id,
      description: description,
      installments: installments,
      payer: payer,
      external_reference: referenceId || `${type}_${Date.now()}`,
      notification_url: `${process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL}/api/payment/webhook`,
      metadata: {
        userId: userId,
        type,
        referenceId
      }
    }

    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${referenceId}-card-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    })

    const paymentResult = await paymentResponse.json()

    console.log('� [CARTÃO] Resultado:', paymentResult.status)

    if (!paymentResponse.ok) {
      console.error('❌ Erro no pagamento:', paymentResult)
      return NextResponse.json({
        status: 'rejected',
        statusDetail: paymentResult.cause?.[0]?.code || 'payment_error',
        error: 'Pagamento não processado'
      }, { status: 400 })
    }

    // 4. Atualizar pedido se for ORDER
    if (type === 'ORDER' && referenceId && paymentResult.id) {
      await prisma.order.update({
        where: { id: referenceId },
        data: {
          paymentId: String(paymentResult.id),
          paymentType: 'credit_card',
          paymentStatus: paymentResult.status
        }
      })
    }

    return NextResponse.json({
      success: true,
      paymentId: String(paymentResult.id),
      status: paymentResult.status,
      statusDetail: paymentResult.status_detail
    })

  } catch (error: any) {
    console.error('❌ Erro no processamento:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno',
      status: 'rejected'
    }, { status: 500 })
  }
}
