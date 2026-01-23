import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const approveSchema = z.object({
  adminNotes: z.string().max(500).optional(),
  productReceived: z.boolean().default(false) // Confirma que o produto foi recebido/verificado
})

/**
 * POST /api/admin/returns/[id]/approve
 * Nível: Administrative
 * Descrição: Aprova uma solicitação de devolução e processa o reembolso
 * 
 * REGRA DE NEGÓCIO:
 * - Cancelamento: Reembolso automático
 * - Devolução: Reembolso somente após verificar o produto devolvido
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. AUTHENTICATION & AUTHORIZATION
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem aprovar devoluções' },
        { status: 403 }
      )
    }

    // 2. INPUT VALIDATION
    const requestId = params.id
    let requestData

    try {
      const body = await request.json()
      requestData = approveSchema.parse(body)
    } catch (error) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // 3. FETCH RETURN REQUEST
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: requestId },
      include: {
        order: {
          include: {
            items: true
          }
        },
        user: true
      }
    })

    if (!returnRequest) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' },
        { status: 404 }
      )
    }

    // 4. BUSINESS VALIDATION
    if (returnRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Apenas solicitações pendentes podem ser aprovadas' },
        { status: 400 }
      )
    }

    // 5. UPDATE RETURN REQUEST STATUS
    const updatedRequest = await prisma.returnRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        adminNotes: requestData.adminNotes
      }
    })

    // 6. CALCULATE RETURN VALUE
    // itemIds está armazenado como JSON string
    const itemIdsArray: string[] = JSON.parse(returnRequest.itemIds || '[]')
    const selectedItems = returnRequest.order.items.filter((item: any) => 
      itemIdsArray.includes(item.id)
    )
    const returnValue = selectedItems.reduce((total: number, item: any) => 
      total + (item.price * item.quantity), 0
    )

    // 7. AUDIT LOG
    console.log(`[AUDIT] Return request approved:`, {
      action: 'RETURN_REQUEST_APPROVED',
      adminId: session.user.id,
      adminEmail: session.user.email,
      returnRequestId: requestId,
      orderId: returnRequest.orderId,
      userId: returnRequest.userId,
      returnValue,
      itemCount: returnRequest.itemIds.length,
      reason: returnRequest.reason,
      adminNotes: requestData.adminNotes,
      productReceived: requestData.productReceived,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // ═══════════════════════════════════════════════════════════════
    // 8. PROCESSAR REEMBOLSO (SOMENTE SE PRODUTO FOI VERIFICADO)
    // ═══════════════════════════════════════════════════════════════
    let refundProcessed = false
    let refundMessage = ''
    
    if (requestData.productReceived) {
      console.log('\n💰 [DEVOLUÇÃO] Produto verificado - Processando reembolso...')
      
      // Buscar o pedido com paymentId
      const order = await prisma.order.findUnique({
        where: { id: returnRequest.orderId },
        select: { id: true, paymentId: true, paymentStatus: true, total: true }
      })
      
      if (order?.paymentId && order.paymentStatus === 'approved') {
        try {
          // Buscar configuração do Mercado Pago
          const gateway = await prisma.paymentGateway.findFirst({
            where: { gateway: 'MERCADOPAGO', isActive: true }
          })
          
          if (gateway?.config) {
            let config = gateway.config
            if (typeof config === 'string') {
              config = JSON.parse(config)
            }
            
            const accessToken = (config as any).accessToken
            
            if (accessToken) {
              // Processar reembolso via API HTTP
              const refundResponse = await fetch(
                `https://api.mercadopago.com/v1/payments/${order.paymentId}/refunds`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': `return-${requestId}-${Date.now()}`
                  },
                  body: JSON.stringify({
                    amount: returnValue // Reembolso parcial do valor dos itens devolvidos
                  })
                }
              )
              
              const refundData = await refundResponse.json()
              
              if (refundResponse.ok) {
                console.log(`   ✅ Reembolso processado! ID: ${refundData.id} - R$ ${returnValue.toFixed(2)}`)
                refundProcessed = true
                refundMessage = `Reembolso de R$ ${returnValue.toFixed(2)} processado com sucesso`
                
                // Criar registro do reembolso
                await prisma.refund.create({
                  data: {
                    id: `refund_return_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    orderId: order.id,
                    paymentId: order.paymentId,
                    refundId: refundData.id?.toString(),
                    amount: returnValue,
                    reason: `Devolução aprovada: ${returnRequest.reason}`,
                    gateway: 'MERCADOPAGO',
                    status: 'APPROVED',
                    processedBy: session.user.email || 'admin'
                  }
                })
                
                // Atualizar status do pedido se for devolução total
                if (returnValue >= order.total * 0.95) {
                  await prisma.order.update({
                    where: { id: order.id },
                    data: { paymentStatus: 'refunded' }
                  })
                }
              } else {
                console.error('   ❌ Erro da API MP:', refundData.message || refundData.error)
                refundMessage = `Erro no reembolso: ${refundData.message || 'Tente novamente'}`
                
                // Criar registro pendente para retry
                await prisma.refund.create({
                  data: {
                    id: `refund_return_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    orderId: order.id,
                    paymentId: order.paymentId,
                    amount: returnValue,
                    reason: `Devolução aprovada: ${returnRequest.reason}`,
                    gateway: 'MERCADOPAGO',
                    status: 'PENDING',
                    processedBy: session.user.email || 'admin'
                  }
                })
                refundMessage += ' - Será reprocessado automaticamente'
              }
            }
          }
        } catch (refundError: any) {
          console.error('   ❌ Erro ao processar reembolso:', refundError.message)
          refundMessage = 'Erro ao processar reembolso - Será reprocessado automaticamente'
        }
      } else {
        refundMessage = 'Pedido sem pagamento aprovado para reembolsar'
      }
    } else {
      refundMessage = 'Aguardando recebimento e verificação do produto para processar reembolso'
    }
    
    return NextResponse.json({
      success: true,
      returnRequest: updatedRequest,
      message: 'Solicitação de devolução aprovada com sucesso',
      refundProcessed,
      refundMessage,
      returnValue,
      nextSteps: requestData.productReceived 
        ? 'Reembolso processado' 
        : 'Aguarde o recebimento do produto e aprove novamente com "productReceived: true"'
    })

  } catch (error) {
    console.error('[RETURN_APPROVE] Erro interno:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      returnRequestId: params.id,
      adminId: (await getServerSession(authOptions))?.user?.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}