import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order || !order.marketplaceOrderId) {
      return NextResponse.json(
        { message: 'Pedido não encontrado ou não é de marketplace' },
        { status: 404 }
      )
    }

    // Buscar token ML
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { mercadoLivreAuth: true },
    })

    if (!adminUser?.mercadoLivreAuth) {
      return NextResponse.json(
        { message: 'Autenticação ML não encontrada' },
        { status: 400 }
      )
    }

    const mlAuth = adminUser.mercadoLivreAuth

    // Buscar status atualizado do pedido no ML
    const mlOrderResponse = await fetch(
      `https://api.mercadolibre.com/orders/${order.marketplaceOrderId}`,
      {
        headers: { Authorization: `Bearer ${mlAuth.accessToken}` },
      }
    )

    if (!mlOrderResponse.ok) {
      return NextResponse.json(
        { message: 'Erro ao buscar pedido no ML' },
        { status: 400 }
      )
    }

    const mlOrder = await mlOrderResponse.json()

    // Mapear status do ML para status local
    let newStatus = order.status
    let cancelReason = null

    if (mlOrder.status === 'cancelled') {
      newStatus = 'CANCELLED'
      cancelReason = mlOrder.cancel_detail?.description || 'Cancelado no Mercado Livre'
    } else if (mlOrder.status === 'paid') {
      if (mlOrder.tags.includes('delivered')) {
        newStatus = 'DELIVERED'
      } else if (mlOrder.tags.includes('shipped')) {
        newStatus = 'SHIPPED'
      } else {
        newStatus = 'PROCESSING'
      }
    }

    // Buscar mensagens do comprador relacionadas ao pedido
    let buyerMessages = null
    
    try {
      const packId = mlOrder.pack_id || mlOrder.id
      const messagesResponse = await fetch(
        `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${mlAuth.userId}?tag=post_sale`,
        {
          headers: { Authorization: `Bearer ${mlAuth.accessToken}` },
        }
      )

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        
        if (messagesData.messages && messagesData.messages.length > 0) {
          const messages = messagesData.messages
            .filter((msg: any) => msg.from.user_id !== mlAuth.userId) // Apenas mensagens do comprador
            .map((msg: any) => `[${new Date(msg.date_created).toLocaleString('pt-BR')}] ${msg.text}`)
            .join('\n\n')
          
          buyerMessages = messages || null
        }
      }
    } catch (error) {
      console.error('[Sync Status] Erro ao buscar mensagens:', error)
    }

    // Atualizar pedido local
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        cancelReason,
        buyerMessages
      }
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      mlStatus: mlOrder.status,
      hasMessages: !!buyerMessages
    })

  } catch (error) {
    console.error('[Sync Status] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao sincronizar status' },
      { status: 500 }
    )
  }
}
