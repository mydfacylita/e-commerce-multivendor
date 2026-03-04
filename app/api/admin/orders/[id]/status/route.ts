import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processAffiliateCommission, cancelAffiliateCommission } from '@/lib/affiliate-commission'
import { auditLog } from '@/lib/audit'
import { sendTemplateEmail, EMAIL_TEMPLATES } from '@/lib/email'
import { WhatsAppService } from '@/lib/whatsapp'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    // Verificar autenticação e permissão de admin
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status é obrigatório' },
        { status: 400 }
      )
    }

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Buscar pedido atual
    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id },
      select: { status: true }
    })

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar status do pedido
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Buscar campos de buyer separadamente (não estão no User)
    const orderBuyer = await prisma.order.findUnique({
      where: { id: params.id },
      select: { buyerName: true, buyerEmail: true, buyerPhone: true }
    })

    // Processar comissão de afiliado se aplicável
    let affiliateResult = null

    // 🔍 AuditLog — ISO 27001 A.12.4
    await auditLog({
      userId: session.user.id,
      action: 'ORDER_STATUS_CHANGED',
      resource: 'Order',
      resourceId: params.id,
      status: 'SUCCESS',
      details: {
        previousStatus: currentOrder.status,
        newStatus: status,
        orderId: params.id,
      },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    })

    if (status === 'DELIVERED') {
      // Quando entregue, liberar comissão
      affiliateResult = await processAffiliateCommission(params.id)
      console.log('📦 [STATUS UPDATE] Pedido marcado como DELIVERED')
      console.log('💰 [AFILIADO] Resultado:', affiliateResult)
    } else if (status === 'CANCELLED') {
      // Quando cancelado, cancelar comissão
      affiliateResult = await cancelAffiliateCommission(params.id)
      console.log('❌ [STATUS UPDATE] Pedido marcado como CANCELLED')
      console.log('💸 [AFILIADO] Resultado:', affiliateResult)

      // Notificar comprador
      const toEmail = orderBuyer?.buyerEmail || order.user?.email
      const toName = orderBuyer?.buyerName || order.user?.name || 'Cliente'
      const toPhone = orderBuyer?.buyerPhone

      if (toEmail) {
        sendTemplateEmail(EMAIL_TEMPLATES.ORDER_CANCELLED, toEmail, {
          customerName: toName,
          orderId: params.id,
          orderTotal: Number(order.total ?? 0).toFixed(2)
        }).catch((e: any) => console.error('⚠️ Email cancelamento admin falhou:', e?.message))
      }
      if (toPhone) {
        WhatsAppService.sendOrderCancelled(toPhone, {
          orderId: params.id.slice(-8).toUpperCase(),
          buyerName: toName
        }).catch((e: any) => console.error('⚠️ WhatsApp cancelamento admin falhou:', e?.message))
      }
    } else if (status === 'SHIPPED') {
      console.log('🚧 [STATUS UPDATE] Pedido marcado como SHIPPED')

      const toEmail = orderBuyer?.buyerEmail || order.user?.email
      const toName = orderBuyer?.buyerName || order.user?.name || 'Cliente'
      const toPhone = orderBuyer?.buyerPhone

      if (toEmail) {
        sendTemplateEmail(EMAIL_TEMPLATES.ORDER_SHIPPED, toEmail, {
          customerName: toName,
          orderId: params.id,
          orderTotal: Number(order.total ?? 0).toFixed(2)
        }).catch((e: any) => console.error('⚠️ Email envio admin falhou:', e?.message))
      }
      if (toPhone) {
        WhatsAppService.sendOrderShipped(toPhone, {
          orderId: params.id.slice(-8).toUpperCase(),
          buyerName: toName
        }).catch((e: any) => console.error('⚠️ WhatsApp envio admin falhou:', e?.message))
      }
    }

    return NextResponse.json({
      message: 'Status atualizado com sucesso',
      order,
      affiliate: affiliateResult
    })
  } catch (error: any) {
    console.error('[ADMIN] Erro ao atualizar status:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar status' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        buyerName: true,
        total: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar status:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar status' },
      { status: 500 }
    )
  }
}
