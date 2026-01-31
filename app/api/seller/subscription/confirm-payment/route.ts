import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/seller/subscription/confirm-payment
 * Confirma o pagamento e ativa a subscription
 * 
 * IMPORTANTE: Em produção, este endpoint seria chamado pelo webhook do gateway de pagamento
 * (Stripe, PagSeguro, Mercado Pago, etc) com validação de assinatura/hash
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar usuário e seller
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        seller: {
          include: {
            subscriptions: {
              where: { status: 'PENDING_PAYMENT' },
              include: { plan: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    if (!user?.seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    const subscription = user.seller.subscriptions?.[0]

    if (!subscription) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada' }, { status: 404 })
    }

    if (subscription.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ 
        error: 'Assinatura não está aguardando pagamento',
        currentStatus: subscription.status 
      }, { status: 400 })
    }

    // Determinar status final baseado em trial
    const now = new Date()
    const finalStatus = subscription.plan.hasFreeTrial && 
                        subscription.trialEndDate && 
                        subscription.trialEndDate > now 
                        ? 'TRIAL' 
                        : 'ACTIVE'

    // Atualizar subscription para ativa
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: finalStatus,
        // Se tinha trial, garante que as datas estão corretas
        ...(finalStatus === 'TRIAL' && {
          startDate: now,
          trialEndDate: new Date(now.getTime() + (subscription.plan.trialDays! * 24 * 60 * 60 * 1000))
        })
      },
      include: {
        plan: true
      }
    })

    // Log da ativação
    console.log('💰 Pagamento confirmado:', {
      subscriptionId: subscription.id,
      sellerId: user.seller.id,
      plan: subscription.plan.name,
      status: finalStatus,
      price: subscription.price
    })

    // TODO: Em produção, enviar email de confirmação aqui

    return NextResponse.json({
      message: 'Pagamento confirmado! Assinatura ativada.',
      subscription: updatedSubscription,
      status: finalStatus
    })

  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error)
    return NextResponse.json(
      { error: 'Erro ao confirmar pagamento' },
      { status: 500 }
    )
  }
}

/**
 * Webhook para receber confirmação de pagamento de gateway externo
 * POST /api/seller/subscription/confirm-payment/webhook
 * 
 * Este endpoint seria usado por gateways como Stripe, PagSeguro, etc
 * Requer validação de assinatura/hash do gateway
 */
export async function PUT(request: NextRequest) {
  try {
    // TODO: Validar assinatura/hash do gateway de pagamento
    // const signature = request.headers.get('X-Gateway-Signature')
    // if (!isValidSignature(signature, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const body = await request.json()
    const { subscriptionId, status, transactionId } = body

    if (!subscriptionId || !status) {
      return NextResponse.json({ 
        error: 'subscriptionId e status são obrigatórios' 
      }, { status: 400 })
    }

    // Buscar subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, seller: true }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription não encontrada' }, { status: 404 })
    }

    // Atualizar baseado no status do pagamento
    let newStatus: string

    switch (status) {
      case 'approved':
      case 'paid':
        // Determinar se é TRIAL ou ACTIVE
        const now = new Date()
        newStatus = subscription.plan.hasFreeTrial && 
                    subscription.trialEndDate && 
                    subscription.trialEndDate > now 
                    ? 'TRIAL' 
                    : 'ACTIVE'
        break
      
      case 'rejected':
      case 'cancelled':
        newStatus = 'CANCELLED'
        break
      
      default:
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    // Atualizar subscription
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: newStatus as any }
    })

    console.log('🔔 Webhook pagamento processado:', {
      subscriptionId,
      transactionId,
      status,
      newStatus,
      sellerId: subscription.seller.id
    })

    return NextResponse.json({
      message: 'Webhook processado',
      subscription: updated
    })

  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}
