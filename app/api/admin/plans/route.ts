import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      },
      orderBy: [
        { isPopular: 'desc' },
        { price: 'asc' }
      ]
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Erro ao buscar planos:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar planos' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const data = await req.json()

    // Validações básicas
    if (!data.name || !data.price || !data.billingCycle) {
      return NextResponse.json(
        { message: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Se este plano está sendo marcado como popular, desmarcar outros
    if (data.isPopular) {
      await prisma.plan.updateMany({
        where: { isPopular: true },
        data: { isPopular: false }
      })
    }

    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        billingCycle: data.billingCycle,
        maxProducts: data.maxProducts,
        maxOrders: data.maxOrders,
        maxRevenue: data.maxRevenue,
        hasMarketplaceIntegration: data.hasMarketplaceIntegration,
        hasDropshipping: data.hasDropshipping,
        hasAdvancedAnalytics: data.hasAdvancedAnalytics,
        hasCustomBranding: data.hasCustomBranding,
        hasPrioritySupport: data.hasPrioritySupport,
        platformCommission: data.platformCommission,
        isActive: data.isActive,
        isPopular: data.isPopular,
        hasFreeTrial: data.hasFreeTrial,
        trialDays: data.trialDays
      }
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar plano:', error)
    return NextResponse.json(
      { message: 'Erro ao criar plano' },
      { status: 500 }
    )
  }
}