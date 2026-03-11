import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'

/**
 * POST /api/payment/myd-account
 * Paga um pedido usando o saldo da Conta MYD (cashback)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = session.user.id
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId obrigatório' }, { status: 400 })
    }

    // Buscar o pedido e verificar que pertence ao usuário
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, total: true, status: true, parentOrderId: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.userId !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      return NextResponse.json({ error: 'Este pedido já foi pago' }, { status: 400 })
    }

    // Buscar saldo de cashback do cliente
    const cashback = await prisma.customerCashback.findUnique({
      where: { userId }
    })

    const saldoDisponivel = cashback?.balance ?? 0

    // Calcular total real (incluindo pedidos agrupados se houver parentOrderId)
    let totalAPagar = order.total
    let orderIds: string[] = [order.id]

    if (order.parentOrderId) {
      const relatedOrders = await prisma.order.findMany({
        where: {
          OR: [
            { id: order.parentOrderId },
            { parentOrderId: order.parentOrderId }
          ]
        },
        select: { id: true, total: true }
      })
      totalAPagar = relatedOrders.reduce((sum, o) => sum + o.total, 0)
      orderIds = relatedOrders.map(o => o.id)
    }

    if (saldoDisponivel < totalAPagar) {
      return NextResponse.json({
        error: `Saldo insuficiente. Saldo disponível: R$ ${saldoDisponivel.toFixed(2)}, Total do pedido: R$ ${totalAPagar.toFixed(2)}`
      }, { status: 400 })
    }

    const novoSaldo = saldoDisponivel - totalAPagar

    // Executar em transação: debitar saldo + aprovar pedido(s)
    await prisma.$transaction(async (tx) => {
      // Debitar cashback
      await tx.customerCashback.update({
        where: { userId },
        data: {
          balance: novoSaldo,
          totalUsed: { increment: totalAPagar }
        }
      })

      // Registrar transação de cashback
      await tx.cashbackTransaction.create({
        data: {
          cashbackId: cashback!.id,
          type: 'DEBIT',
          amount: totalAPagar,
          balanceBefore: saldoDisponivel,
          balanceAfter: novoSaldo,
          description: `Pagamento do pedido #${orderId.slice(0, 8).toUpperCase()} via Conta MYD`,
          orderId: orderId,
          status: 'USED'
        }
      })

      // Atualizar pedido(s) para PROCESSING
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: {
          status: 'PROCESSING',
          paymentStatus: 'approved',
          paymentApprovedAt: new Date(),
          paymentType: 'myd_account'
        }
      })
    })

    console.log(`✅ Pedido ${orderId} pago via Conta MYD. Saldo debitado: R$ ${totalAPagar.toFixed(2)}`)

    return NextResponse.json({
      success: true,
      message: 'Pagamento realizado com sucesso!',
      saldoAnterior: saldoDisponivel,
      saldoAtual: novoSaldo,
      valorPago: totalAPagar
    })

  } catch (error) {
    console.error('❌ Erro ao pagar via Conta MYD:', error)
    return NextResponse.json({ error: 'Erro interno ao processar pagamento' }, { status: 500 })
  }
}
