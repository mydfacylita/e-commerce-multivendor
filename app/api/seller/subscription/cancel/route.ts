import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveSubscription } from '@/lib/subscription'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SELLER') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
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

    // Buscar assinatura ativa usando a nova função
    const subscription = await getActiveSubscription(seller.id)

    if (!subscription) {
      return NextResponse.json(
        { message: 'Nenhuma assinatura ativa para cancelar' },
        { status: 400 }
      )
    }

    // Atualizar assinatura como cancelada
    const cancelledSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        autoRenew: false
      }
    })

    return NextResponse.json({
      message: 'Assinatura cancelada com sucesso!',
      subscription: cancelledSubscription
    })

  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error)
    return NextResponse.json(
      { message: 'Erro ao cancelar assinatura' },
      { status: 500 }
    )
  }
}