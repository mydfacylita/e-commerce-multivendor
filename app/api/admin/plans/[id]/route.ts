import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    })

    if (!plan) {
      return NextResponse.json(
        { message: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Erro ao buscar plano:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar plano' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const data = await req.json()

    // Verificar se o plano existe
    const existingPlan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' }
        }
      }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { message: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Se este plano está sendo marcado como popular, desmarcar outros
    if (data.isPopular && !existingPlan.isPopular) {
      await prisma.plan.updateMany({
        where: { 
          isPopular: true,
          id: { not: params.id }
        },
        data: { isPopular: false }
      })
    }

    const plan = await prisma.plan.update({
      where: { id: params.id },
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

    // Se há assinantes ativos e mudanças significativas, criar logs para notificação
    if (existingPlan.subscriptions.length > 0) {
      const significantChanges = []
      
      if (existingPlan.price !== data.price) {
        significantChanges.push(`Preço alterado de R$ ${existingPlan.price} para R$ ${data.price}`)
      }
      
      if (existingPlan.platformCommission !== data.platformCommission) {
        significantChanges.push(`Comissão alterada de ${existingPlan.platformCommission}% para ${data.platformCommission}%`)
      }

      if (existingPlan.maxProducts !== data.maxProducts) {
        significantChanges.push(`Limite de produtos alterado`)
      }

      if (significantChanges.length > 0) {
        console.log(`🔔 Plano ${plan.name} atualizado com mudanças significativas:`, significantChanges)
        // Aqui você pode implementar um sistema de notificação/email
      }
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Erro ao atualizar plano:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar plano' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Verificar se o plano tem assinaturas ativas
    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    })

    if (!plan) {
      return NextResponse.json(
        { message: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    if (plan._count.subscriptions > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir um plano com assinaturas ativas' },
        { status: 400 }
      )
    }

    await prisma.plan.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Plano excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir plano:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir plano' },
      { status: 500 }
    )
  }
}