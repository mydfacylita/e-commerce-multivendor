import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEANBatch } from '@/lib/ean-generator'
import { PaymentService } from '@/lib/payment'

/**
 * POST /api/vendedor/ean/request
 * Vendedor solicita códigos EAN
 * - Grátis: Aprova automaticamente
 * - Pago com saldo: Debita e aprova automaticamente  
 * - Pago sem saldo: Retorna link de pagamento
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar seller
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller || seller.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Vendedor não ativo' }, { status: 403 })
    }

    const { packageId, quantity, type, price, paymentMethod } = await request.json()

    if (!packageId || !quantity || !type) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    if (quantity < 1 || quantity > 1000) {
      return NextResponse.json({ error: 'Quantidade inválida (1-1000)' }, { status: 400 })
    }

    if (!['OFFICIAL', 'INTERNAL'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    const purchaseId = crypto.randomUUID()
    const priceValue = Number(price) || 0

    // CASO 1: GRÁTIS - Aprova e gera códigos automaticamente
    if (priceValue === 0) {
      await prisma.$transaction(async (tx) => {
        // Criar EANPurchase como PAID (grátis)
        await tx.$executeRaw`
          INSERT INTO EANPurchase (id, sellerId, packageId, quantity, type, price, status, paidAt, createdAt)
          VALUES (${purchaseId}, ${seller.id}, ${packageId}, ${quantity}, ${type}, 0, 'PAID', NOW(), NOW())
        `

        // Gerar códigos imediatamente
        const prefix = type === 'OFFICIAL' ? '789' : '200'
        const codes = generateEANBatch(Number(quantity), prefix)
        
        for (const code of codes) {
          const codeId = crypto.randomUUID()
          await tx.$executeRaw`
            INSERT INTO EANCode (id, sellerId, code, type, used, createdAt)
            VALUES (${codeId}, ${seller.id}, ${code}, ${type}, FALSE, NOW())
          `
        }

        // Criar créditos
        const creditId = crypto.randomUUID()
        await tx.$executeRaw`
          INSERT INTO EANCredit (id, sellerId, quantity, used, type, purchaseId, createdAt)
          VALUES (${creditId}, ${seller.id}, ${quantity}, 0, ${type}, ${purchaseId}, NOW())
        `
      })

      return NextResponse.json({
        success: true,
        autoApproved: true,
        message: `✅ Solicitação aprovada! ${quantity} códigos EAN gerados com sucesso.`,
        purchaseId
      })
    }

    // CASO 2: PAGO COM SALDO - Debita e aprova automaticamente
    if (paymentMethod === 'balance' && seller.balance >= priceValue) {
      await prisma.$transaction(async (tx) => {
        // Criar purchase como PAID
        await tx.$executeRaw`
          INSERT INTO EANPurchase (id, sellerId, packageId, quantity, type, price, status, paidAt, createdAt)
          VALUES (${purchaseId}, ${seller.id}, ${packageId}, ${quantity}, ${type}, ${priceValue}, 'PAID', NOW(), NOW())
        `

        // Debitar saldo do vendedor
        await tx.$executeRaw`
          UPDATE seller 
          SET balance = balance - ${priceValue},
              totalWithdrawn = totalWithdrawn + ${priceValue}
          WHERE id = ${seller.id}
        `

        // Gerar códigos
        const prefix = type === 'OFFICIAL' ? '789' : '200'
        const codes = generateEANBatch(Number(quantity), prefix)
        
        for (const code of codes) {
          const codeId = crypto.randomUUID()
          await tx.$executeRaw`
            INSERT INTO EANCode (id, sellerId, code, type, used, createdAt)
            VALUES (${codeId}, ${seller.id}, ${code}, ${type}, FALSE, NOW())
          `
        }

        // Criar créditos
        const creditId = crypto.randomUUID()
        await tx.$executeRaw`
          INSERT INTO EANCredit (id, sellerId, quantity, used, type, purchaseId, createdAt)
          VALUES (${creditId}, ${seller.id}, ${quantity}, 0, ${type}, ${purchaseId}, NOW())
        `
      })

      return NextResponse.json({
        success: true,
        autoApproved: true,
        paidWithBalance: true,
        message: `✅ Pagamento realizado via saldo! ${quantity} códigos EAN gerados.`,
        newBalance: seller.balance - priceValue,
        purchaseId
      })
    }

    // CASO 3: PAGO SEM SALDO - Gerar link de pagamento
    await prisma.$executeRaw`
      INSERT INTO EANPurchase (id, sellerId, packageId, quantity, type, price, status, createdAt)
      VALUES (${purchaseId}, ${seller.id}, ${packageId}, ${quantity}, ${type}, ${priceValue}, 'PENDING', NOW())
    `

    // Gerar pagamento via Mercado Pago
    const paymentResult = await PaymentService.createPayment({
      amount: priceValue,
      description: `Compra de ${quantity} códigos EAN ${type === 'OFFICIAL' ? 'Oficiais GS1' : 'Internos'}`,
      payerEmail: session.user.email!,
      payerName: seller.storeName,
      externalReference: purchaseId,
      notificationUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/mercadopago`,
      metadata: {
        type: 'ean_purchase',
        sellerId: seller.id,
        purchaseId,
        quantity,
        eanType: type
      }
    })

    if (!paymentResult.success) {
      return NextResponse.json({
        error: paymentResult.error || 'Erro ao gerar pagamento'
      }, { status: 500 })
    }

    // Atualizar purchase com paymentId
    await prisma.$executeRaw`
      UPDATE EANPurchase 
      SET paymentId = ${paymentResult.paymentId}
      WHERE id = ${purchaseId}
    `

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      paymentUrl: paymentResult.paymentUrl,
      qrCode: paymentResult.qrCode,
      qrCodeBase64: paymentResult.qrCodeBase64,
      paymentId: paymentResult.paymentId,
      message: 'Pagamento gerado! Complete o pagamento para receber os códigos.',
      purchaseId
    })

  } catch (error: any) {
    console.error('Erro ao criar solicitação:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao solicitar códigos EAN' },
      { status: 500 }
    )
  }
}
