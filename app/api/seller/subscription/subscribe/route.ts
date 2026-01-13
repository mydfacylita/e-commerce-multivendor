import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SELLER') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { planId } = await req.json()

    // Buscar vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        subscription: true
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

    // Verificar se já tem assinatura ativa
    if (seller.subscription && seller.subscription.status === 'ACTIVE') {
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
    if (seller.subscription) {
      await prisma.subscription.delete({
        where: { id: seller.subscription.id }
      })
    }

    // Criar nova assinatura
    const subscription = await prisma.subscription.create({
      data: {
        sellerId: seller.id,
        planId: plan.id,
        status: plan.hasFreeTrial && plan.trialDays ? 'TRIAL' : 'ACTIVE',
        startDate,
        endDate,
        trialEndDate,
        price: plan.price,
        billingCycle: plan.billingCycle,
        nextBillingDate: plan.hasFreeTrial && plan.trialDays ? trialEndDate : endDate,
        autoRenew: true
      },
      include: {
        plan: true
      }
    })

    return NextResponse.json({
      message: 'Assinatura criada com sucesso!',
      subscription
    })

  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json(
      { message: 'Erro ao criar assinatura' },
      { status: 500 }
    )
  }
}