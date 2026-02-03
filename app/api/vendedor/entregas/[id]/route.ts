import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Marcar como entregue
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        sellerId: seller.id
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { receiverName, receiverDocument, deliveryNotes, deliveryPhoto } = body

    // Validar dados obrigatórios
    if (!receiverName) {
      return NextResponse.json({ error: 'Nome de quem recebeu é obrigatório' }, { status: 400 })
    }

    // Atualizar pedido como entregue
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveredBy: session.user.name || session.user.email,
        receiverName,
        receiverDocument: receiverDocument || null,
        deliveryNotes: deliveryNotes || null,
        deliveryPhoto: deliveryPhoto || null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Entrega confirmada com sucesso!',
      order: updatedOrder
    })
  } catch (error: any) {
    console.error('Erro ao confirmar entrega:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Registrar tentativa de entrega falha
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        sellerId: seller.id
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { reason } = body

    // Incrementar tentativas e adicionar nota
    const currentNotes = order.deliveryNotes || ''
    const newNote = `[${new Date().toLocaleString('pt-BR')}] Tentativa falha: ${reason || 'Destinatário ausente'}`
    
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        deliveryAttempts: (order.deliveryAttempts || 0) + 1,
        deliveryNotes: currentNotes ? `${currentNotes}\n${newNote}` : newNote
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Tentativa de entrega registrada',
      attempts: updatedOrder.deliveryAttempts
    })
  } catch (error: any) {
    console.error('Erro ao registrar tentativa:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
