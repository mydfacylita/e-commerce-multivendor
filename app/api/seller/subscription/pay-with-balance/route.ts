import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveSubscription } from '@/lib/subscription'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/seller/subscription/pay-with-balance
 * Paga a assinatura usando o saldo da conta digital do vendedor
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar vendedor com conta
    const seller = await prisma.seller.findFirst({
      where: { userId: session.user.id },
      include: {
        account: true
      }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    // Buscar assinatura ativa
    const subscription = await getActiveSubscription(seller.id)
    const account = seller.account

    if (!subscription) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada' }, { status: 404 })
    }

    if (subscription.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ 
        error: 'Assinatura não está aguardando pagamento',
        currentStatus: subscription.status 
      }, { status: 400 })
    }

    if (!account) {
      return NextResponse.json({ error: 'Conta digital não encontrada' }, { status: 404 })
    }

    if (account.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Sua conta digital não está ativa' }, { status: 400 })
    }

    const planPrice = subscription.price

    if (account.balance < planPrice) {
      return NextResponse.json({ 
        error: 'Saldo insuficiente',
        balance: account.balance,
        required: planPrice
      }, { status: 400 })
    }

    // Usar transação para garantir atomicidade
    const result = await prisma.$transaction(async (tx) => {
      // 1. Debitar o valor da conta do vendedor
      const updatedAccount = await tx.sellerAccount.update({
        where: { id: account.id },
        data: {
          balance: {
            decrement: planPrice
          }
        }
      })

      // 2. Criar transação de débito
      await tx.sellerAccountTransaction.create({
        data: {
          accountId: account.id,
          type: 'ADJUSTMENT_DEBIT',
          amount: planPrice,
          balanceBefore: account.balance,
          balanceAfter: account.balance - planPrice,
          description: `Pagamento do plano ${subscription.plan.name}`,
          referenceType: 'SUBSCRIPTION',
          reference: subscription.id,
          status: 'COMPLETED',
          metadata: JSON.stringify({
            subscriptionId: subscription.id,
            planId: subscription.planId,
            planName: subscription.plan.name
          })
        }
      })

      // 3. Ativar a assinatura
      const updatedSubscription = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          startDate: new Date()
        },
        include: {
          plan: true
        }
      })

      // 4. Registrar pagamento (se houver tabela de pagamentos)
      // Opcional: criar registro na tabela de pagamentos

      return {
        subscription: updatedSubscription,
        account: updatedAccount
      }
    })

    console.log('💰 Pagamento com saldo realizado:', {
      sellerId: seller.id,
      subscriptionId: subscription.id,
      amount: planPrice,
      newBalance: result.account.balance
    })

    return NextResponse.json({
      success: true,
      message: 'Pagamento realizado com sucesso!',
      subscription: result.subscription,
      newBalance: result.account.balance,
      amountPaid: planPrice
    })

  } catch (error) {
    console.error('Erro ao processar pagamento com saldo:', error)
    return NextResponse.json(
      { error: 'Erro ao processar pagamento' },
      { status: 500 }
    )
  }
}
