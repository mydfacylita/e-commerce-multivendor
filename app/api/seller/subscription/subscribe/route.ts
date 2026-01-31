import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveSubscription, generateContractNumber } from '@/lib/subscription'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SELLER') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Tratar body vazio ou inválido
    let planId: string | undefined
    try {
      const body = await req.json()
      planId = body.planId
    } catch {
      // Body vazio - não é erro se veio de redirect
    }

    if (!planId) {
      return NextResponse.json(
        { message: 'ID do plano é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        subscriptions: true
      }
    })

    if (!seller) {
      return NextResponse.json(
        { message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o plano existe e está ativo
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    })

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { message: 'Plano não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Buscar assinatura ativa usando a nova função
    const currentSubscription = await getActiveSubscription(seller.id)

    // Verificar se já tem assinatura ativa
    if (currentSubscription && currentSubscription.status === 'ACTIVE') {
      return NextResponse.json(
        { message: 'Você já possui uma assinatura ativa. Cancele primeiro para trocar de plano.' },
        { status: 400 }
      )
    }

    // Calcular datas
    const now = new Date()
    const startDate = now
    let endDate = new Date(now)
    let trialEndDate = null

    // Se tem trial gratuito
    if (plan.hasFreeTrial && plan.trialDays) {
      trialEndDate = new Date(now)
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays)
      
      // End date será depois do trial
      endDate = new Date(trialEndDate)
    }

    // Calcular próxima data de cobrança baseada no ciclo
    switch (plan.billingCycle) {
      case 'MONTHLY':
        endDate.setMonth(endDate.getMonth() + 1)
        break
      case 'QUARTERLY':
        endDate.setMonth(endDate.getMonth() + 3)
        break
      case 'SEMIANNUAL':
        endDate.setMonth(endDate.getMonth() + 6)
        break
      case 'ANNUAL':
        endDate.setFullYear(endDate.getFullYear() + 1)
        break
    }

    // Remover assinatura anterior se existir
    if (currentSubscription) {
      await prisma.subscription.delete({
        where: { id: currentSubscription.id }
      })
    }

    // Determinar status inicial
    // - Se tem trial: TRIAL (acesso liberado durante trial)
    // - Se não tem trial e plano é pago: PENDING_PAYMENT (precisa pagar primeiro)
    // - Se plano é gratuito (price = 0): ACTIVE
    const hasTrial = plan.hasFreeTrial && plan.trialDays && plan.trialDays > 0
    const isPaidPlan = plan.price > 0
    
    let initialStatus: 'TRIAL' | 'ACTIVE' | 'PENDING_PAYMENT'
    let requiresPayment = false
    
    if (hasTrial) {
      initialStatus = 'TRIAL'
    } else if (isPaidPlan) {
      initialStatus = 'PENDING_PAYMENT' as any // Precisa pagar antes de ativar
      requiresPayment = true
    } else {
      initialStatus = 'ACTIVE' // Plano gratuito
    }

    // Criar nova assinatura
    const subscription = await prisma.subscription.create({
      data: {
        sellerId: seller.id,
        planId: plan.id,
        status: initialStatus as any,
        startDate,
        endDate,
        trialEndDate,
        price: plan.price,
        billingCycle: plan.billingCycle,
        nextBillingDate: hasTrial ? trialEndDate : endDate,
        autoRenew: true,
        contractNumber: generateContractNumber()
      },
      include: {
        plan: true
      }
    })

    return NextResponse.json({
      message: requiresPayment ? 'Plano selecionado! Complete o pagamento.' : 'Assinatura criada com sucesso!',
      subscription,
      requiresPayment,
      status: initialStatus
    })

  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json(
      { message: 'Erro ao criar assinatura' },
      { status: 500 }
    )
  }
}