/**
 * API para reprocessar um reembolso que falhou
 * POST /api/admin/refunds/[id]/retry
 * 
 * Nível de segurança: 4 (Admin Only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const refundId = params.id

    // Buscar o reembolso
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          select: { id: true, status: true, paymentId: true }
        }
      }
    })

    if (!refund) {
      return NextResponse.json(
        { error: 'Reembolso não encontrado' },
        { status: 404 }
      )
    }

    if (refund.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Este reembolso já foi processado' },
        { status: 400 }
      )
    }

    // Buscar token do Mercado Pago
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!gateway?.config) {
      return NextResponse.json(
        { error: 'Gateway Mercado Pago não configurado' },
        { status: 500 }
      )
    }

    let config = gateway.config
    if (typeof config === 'string') {
      config = JSON.parse(config)
    }

    const accessToken = (config as any).accessToken
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Token do Mercado Pago não configurado' },
        { status: 500 }
      )
    }

    // Tentar processar o reembolso
    const paymentId = refund.paymentId

    if (!paymentId || !/^\d+$/.test(paymentId)) {
      return NextResponse.json(
        { error: 'PaymentId inválido para este reembolso' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `refund-retry-${refundId}-${Date.now()}`
        },
        body: JSON.stringify({
          amount: refund.amount
        })
      }
    )

    const responseData = await response.json()

    if (response.ok) {
      // Reembolso processado com sucesso
      await prisma.refund.update({
        where: { id: refundId },
        data: { 
          status: 'APPROVED',
          refundId: String(responseData.id),
          processedBy: session.user.email || 'admin'
        }
      })
      
      // Atualizar paymentStatus do pedido
      await prisma.order.update({
        where: { id: refund.orderId },
        data: { paymentStatus: 'refunded' }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Reembolso processado com sucesso',
        refundId: responseData.id,
        amount: refund.amount
      })
    } else {
      const errorMsg = responseData.message || responseData.error || 'Erro desconhecido'
      
      // Verificar se já foi reembolsado
      if (errorMsg.includes('already refunded') || errorMsg.includes('Payment already refunded')) {
        await prisma.refund.update({
          where: { id: refundId },
          data: { 
            status: 'APPROVED',
            reason: (refund.reason || '') + ' | Já reembolsado anteriormente',
            processedBy: session.user.email || 'admin'
          }
        })
        
        return NextResponse.json({
          success: true,
          message: 'Pagamento já estava reembolsado anteriormente',
          amount: refund.amount
        })
      }
      
      // Atualizar com o erro
      await prisma.refund.update({
        where: { id: refundId },
        data: { 
          reason: (refund.reason || '') + ` | Retry falhou: ${errorMsg}`
        }
      })
      
      return NextResponse.json(
        { error: `Falha no reembolso: ${errorMsg}` },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('[REFUND-RETRY] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar reembolso' },
      { status: 500 }
    )
  }
}
