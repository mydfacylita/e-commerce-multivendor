import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PaymentService } from '@/lib/payment'
import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/lib/whatsapp'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

/**
 * POST /api/payment/create
 * Cria um pagamento - endpoint unificado para todo o sistema
 * Suporta autenticação via NextAuth (web) ou JWT (app mobile)
 */
export async function POST(request: NextRequest) {
  try {
    // Tenta autenticação via NextAuth (sessão web)
    const session = await getServerSession(authOptions)
    let userId: string | null = session?.user?.id || null
    let userEmail: string | null = session?.user?.email || null
    let userName: string | null = session?.user?.name || null
    
    // Se não tem sessão, tenta autenticação via JWT (app mobile)
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email?: string; name?: string }
          userId = decoded.sub
          userEmail = decoded.email || null
          console.log('📱 [PAYMENT CREATE] Autenticação JWT:', { userId })
        } catch (jwtError) {
          console.error('❌ [PAYMENT CREATE] JWT inválido:', jwtError)
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
      type, // 'SUBSCRIPTION' | 'ORDER' | 'OTHER'
      referenceId, // ID da subscription, order, etc
      externalReference, // Identificador único por tentativa (opcional)
      gateway, // Opcional: forçar gateway específico
      paymentMethod, // 'pix' | 'boleto' | 'credit_card' | 'debit_card'
      // Campos para cartão de crédito
      cardToken,
      installments,
      paymentMethodId, // Bandeira do cartão
      payer // Dados do pagador (identification)
    } = body

    // Validações
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    // Mercado Pago exige valor mínimo de R$ 1,00 para PIX
    if (paymentMethod === 'pix' && amount < 1) {
      return NextResponse.json({ 
        error: 'O valor mínimo para pagamento via PIX é R$ 1,00' 
      }, { status: 400 })
    }

    if (!description) {
      return NextResponse.json({ error: 'Descrição obrigatória' }, { status: 400 })
    }

    // Para pedidos, buscar dados do comprador (CPF, telefone, endereço) para pagamento
    let payerDocument: string | undefined
    let payerPhone: string | undefined
    let payerName = userName || undefined
    let payerAddress: {
      street: string
      number: string
      complement?: string
      neighborhood: string
      city: string
      state: string
      zipCode: string
    } | undefined
    
    if (type === 'ORDER' && referenceId) {
      const orderData = await prisma.order.findUnique({
        where: { id: referenceId },
        select: { buyerName: true, buyerPhone: true, buyerCpf: true, shippingAddress: true }
      })
      
      if (orderData) {
        payerDocument = orderData.buyerCpf || undefined
        payerPhone = orderData.buyerPhone || undefined
        payerName = orderData.buyerName || payerName
        
        // Tentar parsear endereço como JSON (novo formato)
        if (orderData.shippingAddress) {
          try {
            const addrData = JSON.parse(orderData.shippingAddress)
            if (addrData.zipCode && addrData.city) {
              payerAddress = {
                street: addrData.street || 'Rua',
                number: addrData.number || 'SN',
                complement: addrData.complement || undefined,
                neighborhood: addrData.neighborhood || 'Centro',
                city: addrData.city,
                state: addrData.state,
                zipCode: addrData.zipCode.replace(/\D/g, '')
              }
            }
          } catch (e) {
            // Endereço no formato antigo (string simples), não tem dados estruturados
            console.log('⚠️ Endereço no formato antigo (string), boleto pode falhar')
          }
        }
        
        console.log('📋 Dados do comprador para pagamento:', { 
          name: payerName, 
          cpf: payerDocument ? '***' + payerDocument.slice(-4) : 'N/A',
          phone: payerPhone || 'N/A',
          address: payerAddress ? `${payerAddress.city}/${payerAddress.state}` : 'N/A'
        })
      }
    }

    // Preparar dados do pagamento
    // Usar externalReference único se fornecido, senão usar referenceId com timestamp
    const paymentData: any = {
      amount,
      description,
      payerEmail: userEmail!,
      payerName,
      payerDocument, // CPF do comprador - ajuda a evitar rejected_high_risk
      payerPhone,    // Telefone do comprador - ajuda a evitar rejected_high_risk
      payerAddress,  // Endereço do comprador - obrigatório para boleto
      externalReference: externalReference || referenceId || `${type}_${Date.now()}`,
      // WEBHOOK_URL para URL pública (produção), fallback para NEXTAUTH_URL
      notificationUrl: `${process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL}/api/payment/webhook`,
      paymentMethod, // Adicionar método de pagamento
      metadata: {
        userId: userId,
        type,
        referenceId // Manter o referenceId original nos metadados
      }
    }

    // Adicionar dados do cartão se for pagamento com cartão
    if (paymentMethod === 'credit_card') {
      if (!cardToken) {
        return NextResponse.json({ error: 'Token do cartão não fornecido' }, { status: 400 })
      }
      paymentData.cardToken = cardToken
      paymentData.installments = installments || 1
      paymentData.paymentMethodId = paymentMethodId
      if (payer?.identification) {
        paymentData.payer = payer
      }
    }

    // Criar pagamento
    const result = await PaymentService.createPayment(paymentData, gateway)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Se for um pedido (ORDER), salvar o NOVO paymentId no banco
    // Isso substitui qualquer paymentId anterior (rejeitado, expirado, etc)
    // IMPORTANTE: Só salvar se for um paymentId numérico válido (não preferência)
    const isValidPaymentId = result.paymentId && /^\d+$/.test(result.paymentId)
    
    if (type === 'ORDER' && referenceId && isValidPaymentId) {
      try {
        // Buscar o pedido para ver se tem parentOrderId
        const order = await prisma.order.findUnique({
          where: { id: referenceId },
          select: { id: true, parentOrderId: true }
        })

        if (order) {
          // Se tem parentOrderId, atualizar TODOS os pedidos do grupo
          if (order.parentOrderId) {
            await prisma.order.updateMany({
              where: {
                OR: [
                  { id: order.parentOrderId },
                  { parentOrderId: order.parentOrderId }
                ]
              },
              data: {
                paymentId: result.paymentId,
                paymentType: paymentMethod || 'unknown',
                paymentStatus: 'pending'
              }
            })
            console.log(`✅ NOVO PaymentId ${result.paymentId} salvo em TODOS os pedidos do grupo ${order.parentOrderId}`)
          } else {
            // Pedido simples, atualizar só ele
            await prisma.order.update({
              where: { id: referenceId },
              data: {
                paymentId: result.paymentId,
                paymentType: paymentMethod || 'unknown',
                paymentStatus: 'pending'
              }
            })
            console.log(`✅ NOVO PaymentId ${result.paymentId} salvo no pedido ${referenceId}`)
          }
        }
      } catch (error) {
        console.error('❌ Erro ao salvar paymentId no pedido:', error)
      }
    }

    // Se for cartão e foi aprovado, atualizar pedido para PROCESSING
    if (paymentMethod === 'credit_card' && result.status === 'approved' && type === 'ORDER' && referenceId) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: referenceId },
          select: { id: true, parentOrderId: true }
        })

        if (order) {
          const updateData = {
            status: 'PROCESSING' as const,
            paymentStatus: 'approved',
            paymentApprovedAt: new Date(),
            paymentId: result.paymentId,
            paymentType: 'credit_card'
          }

          if (order.parentOrderId) {
            await prisma.order.updateMany({
              where: {
                OR: [
                  { id: order.parentOrderId },
                  { parentOrderId: order.parentOrderId }
                ]
              },
              data: updateData
            })
          } else {
            await prisma.order.update({
              where: { id: referenceId },
              data: updateData
            })
          }
          console.log(`✅ Pedido ${referenceId} atualizado para PROCESSING (cartão aprovado)`)
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar pedido após aprovação:', error)
      }
    }

    // Log
    console.log('💳 Pagamento criado:', {
      userId: userId,
      type,
      amount,
      paymentId: result.paymentId,
      status: result.status,
      gateway
    })

    // Enviar WhatsApp com código PIX ou link do boleto
    if (type === 'ORDER' && referenceId && payerPhone) {
      const orderNumber = referenceId.slice(0, 8).toUpperCase()
      
      // PIX - enviar código copia e cola
      if (paymentMethod === 'pix' && result.qrCode) {
        WhatsAppService.sendPixCode(payerPhone, {
          orderNumber,
          pixCode: result.qrCode,
          amount,
          expiresIn: 'O código expira em 30 minutos'
        }).catch(err => console.error('Erro ao enviar WhatsApp PIX:', err))
      }
      
      // Boleto - enviar link
      if (paymentMethod === 'boleto' && result.boletoUrl) {
        WhatsAppService.sendBoletoLink(payerPhone, {
          orderNumber,
          boletoUrl: result.boletoUrl,
          amount,
          dueDate: '3 dias úteis'
        }).catch(err => console.error('Erro ao enviar WhatsApp Boleto:', err))
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      paymentUrl: result.paymentUrl,
      qrCode: result.qrCode,
      qrCodeBase64: result.qrCodeBase64,
      boletoUrl: result.boletoUrl,
      status: result.status,
      statusDetail: result.statusDetail
    })

  } catch (error) {
    console.error('Erro ao criar pagamento:', error)
    return NextResponse.json(
      { error: 'Erro ao processar pagamento' },
      { status: 500 }
    )
  }
}
