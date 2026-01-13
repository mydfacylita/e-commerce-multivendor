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

    // Buscar vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    })

    if (!seller) {
      return NextResponse.json(
        { message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    // Se não tem assinatura, retornar null
    if (!seller.subscription) {
      return NextResponse.json(null)
    }

    return NextResponse.json(seller.subscription)
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar assinatura' },
      { status: 500 }
    )
  }
}