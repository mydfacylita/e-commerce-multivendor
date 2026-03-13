import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'

/**
 * GET /api/payment/myd-account
 * Retorna saldo da Conta MYD (SellerAccount) + cashback somados
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = session.user.id

    // Saldo da Conta MYD (afiliado ou vendedor)
    let mydAccountBalance = 0

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: { account: { select: { balance: true } } }
    })
    if (affiliate?.account) {
      mydAccountBalance = affiliate.account.balance ?? 0
    } else {
      const seller = await prisma.seller.findFirst({
        where: { userId },
        include: { account: { select: { balance: true } } }
      })
      if (seller?.account) {
        mydAccountBalance = seller.account.balance ?? 0
      }
    }

    // Saldo de cashback
    const cashback = await prisma.customerCashback.findUnique({
      where: { userId },
      select: { balance: true }
    })
    const cashbackBalance = cashback?.balance ?? 0

    return NextResponse.json({
      mydAccountBalance,
      cashbackBalance,
      totalBalance: mydAccountBalance + cashbackBalance
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/payment/myd-account
 * Paga um pedido usando o saldo da Conta MYD (SellerAccount)
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

    // Buscar SellerAccount do usuário (afiliado ou vendedor)
    let sellerAccount: { id: string; balance: number } | null = null

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: { account: { select: { id: true, balance: true } } }
    })

    if (affiliate?.account) {
      sellerAccount = affiliate.account
    } else {
      const seller = await prisma.seller.findFirst({
        where: { userId },
        include: { account: { select: { id: true, balance: true } } }
      })
      if (seller?.account) {
        sellerAccount = seller.account
      }
    }

    // Buscar cashback do usuário
    const cashback = await prisma.customerCashback.findUnique({
      where: { userId }
    })

    const saldoMydAccount = sellerAccount?.balance ?? 0
    const saldoCashback = cashback?.balance ?? 0
    const saldoDisponivel = saldoMydAccount + saldoCashback

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

    // Calcular quanto debitar de cada fonte (usar Conta MYD primeiro, depois cashback)
    const debitoMydAccount = Math.min(saldoMydAccount, totalAPagar)
    const debitoCashback = totalAPagar - debitoMydAccount

    // Executar em transação: debitar ambas as fontes + aprovar pedido(s)
    await prisma.$transaction(async (tx) => {
      // Debitar SellerAccount (se houver saldo)
      if (sellerAccount && debitoMydAccount > 0) {
        const novoSaldoMyd = saldoMydAccount - debitoMydAccount
        await tx.sellerAccount.update({
          where: { id: sellerAccount.id },
          data: { balance: novoSaldoMyd }
        })
        await tx.sellerAccountTransaction.create({
          data: {
            accountId: sellerAccount.id,
            type: 'WITHDRAWAL',
            amount: debitoMydAccount,
            balanceBefore: saldoMydAccount,
            balanceAfter: novoSaldoMyd,
            description: `Pagamento do pedido #${orderId.slice(0, 8).toUpperCase()} via Conta MYD`,
            orderId: orderId,
            status: 'COMPLETED'
          }
        })
      }

      // Debitar Cashback (se necessário)
      if (cashback && debitoCashback > 0) {
        const novoSaldoCashback = saldoCashback - debitoCashback
        await tx.customerCashback.update({
          where: { userId },
          data: {
            balance: novoSaldoCashback,
            totalUsed: { increment: debitoCashback }
          }
        })
        await tx.cashbackTransaction.create({
          data: {
            cashbackId: cashback.id,
            type: 'DEBIT',
            amount: debitoCashback,
            balanceBefore: saldoCashback,
            balanceAfter: novoSaldoCashback,
            description: `Pagamento do pedido #${orderId.slice(0, 8).toUpperCase()} via Conta MYD`,
            orderId: orderId,
            status: 'USED'
          }
        })
      }

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

    return NextResponse.json({
      success: true,
      message: 'Pagamento realizado com sucesso!',
      saldoAtualMyd: saldoMydAccount - debitoMydAccount,
      saldoAtualCashback: saldoCashback - debitoCashback,
      valorPago: totalAPagar
    })

  } catch (error) {
    console.error('❌ Erro ao pagar via Conta MYD:', error)
    return NextResponse.json({ error: 'Erro interno ao processar pagamento' }, { status: 500 })
  }
}
