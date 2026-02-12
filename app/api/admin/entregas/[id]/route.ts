import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processAffiliateCommission } from '@/lib/affiliate-commission'

// POST: Marcar como entregue
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const order = await prisma.order.findFirst({
      where: { id: params.id }
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

    // Processar comissão de afiliado se aplicável
    let affiliateResult = null
    try {
      affiliateResult = await processAffiliateCommission(params.id)
      console.log('📦 [ENTREGAS] Pedido marcado como DELIVERED')
      console.log('💰 [AFILIADO] Resultado:', affiliateResult)
    } catch (affiliateError) {
      console.error('⚠️  [AFILIADO] Erro ao processar comissão:', affiliateError)
      // Não bloqueia a confirmação de entrega se falhar
    }

    return NextResponse.json({
      success: true,
      message: 'Entrega confirmada com sucesso!',
      order: updatedOrder,
      affiliate: affiliateResult
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
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const order = await prisma.order.findFirst({
      where: { id: params.id }
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
