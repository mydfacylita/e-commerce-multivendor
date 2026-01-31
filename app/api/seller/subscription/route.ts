import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveSubscription, getSubscriptionHistory } from '@/lib/subscription'

export async function GET() {
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
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json(
        { message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    // Buscar assinatura ativa
    const subscription = await getActiveSubscription(seller.id)

    // Se não tem assinatura, retornar null
    if (!subscription) {
      return NextResponse.json(null)
    }

    // Buscar histórico para retornar junto
    const history = await getSubscriptionHistory(seller.id)

    return NextResponse.json({
      ...subscription,
      history: history.length > 1 ? history : undefined
    })
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar assinatura' },
      { status: 500 }
    )
  }
}