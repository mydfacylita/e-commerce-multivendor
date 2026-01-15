import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { action, notes } = body

    if (!['approve', 'reject', 'investigating'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Atualizar status baseado na ação
    const updateData: any = {
      fraudCheckedAt: new Date(),
      fraudCheckedBy: session.user.id,
      fraudNotes: notes || null
    }

    if (action === 'approve') {
      updateData.fraudStatus = 'approved'
      // NÃO muda status do pedido automaticamente
      // Pedido só vai para PROCESSING quando pagamento for aprovado
      console.log('[Antifraude] Pedido aprovado - Aguardando confirmação de pagamento')
    } else if (action === 'reject') {
      updateData.fraudStatus = 'rejected'
      updateData.status = 'CANCELLED'
      updateData.cancelReason = 'Pedido rejeitado por suspeita de fraude'
      console.log('[Antifraude] Pedido REJEITADO e CANCELADO')
    } else if (action === 'investigating') {
      updateData.fraudStatus = 'investigating'
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      select: {
        paymentStatus: true,
        status: true,
        fraudStatus: true
      }
    })

    // Se aprovado E pagamento já foi aprovado, liberar para processing
    if (action === 'approve' && updatedOrder.paymentStatus === 'approved') {
      // Buscar itens do pedido para calcular comissões
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: params.id }
      })

      // Atualizar status e balance dos vendedores em uma transação
      await prisma.$transaction(async (tx) => {
        // Mudar status para PROCESSING
        await tx.order.update({
          where: { id: params.id },
          data: { status: 'PROCESSING' }
        })

        // Incrementar balance de cada vendedor envolvido
        const sellerBalances = new Map<string, number>()
        
        for (const item of orderItems) {
          if (item.sellerId && item.sellerRevenue) {
            const current = sellerBalances.get(item.sellerId) || 0
            sellerBalances.set(item.sellerId, current + item.sellerRevenue)
          }
        }

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
      })

      console.log('[Antifraude] Pedido LIBERADO para PROCESSING (pagamento já aprovado)')
    }

    console.log(`[Antifraude] Pedido ${params.id} - Ação: ${action} - Admin: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      action,
      message:
        action === 'approve'
          ? updatedOrder.paymentStatus === 'approved'
            ? 'Pedido aprovado e liberado para processamento'
            : 'Pedido aprovado - Aguardando confirmação de pagamento'
          : action === 'reject'
          ? 'Pedido rejeitado e cancelado'
          : 'Pedido marcado como em investigação',
      needsPayment: action === 'approve' && updatedOrder.paymentStatus !== 'approved'
    })
  } catch (error) {
    console.error('Erro ao revisar fraude:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
