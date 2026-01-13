import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SELLER') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Buscar apenas planos ativos
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [
        { isPopular: 'desc' },
        { price: 'asc' }
      ]
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Erro ao buscar planos disponíveis:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar planos disponíveis' },
      { status: 500 }
    )
  }
}