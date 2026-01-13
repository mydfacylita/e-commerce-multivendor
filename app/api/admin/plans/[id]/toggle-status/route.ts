import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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
      where: { id: params.id }
    })

    if (!plan) {
      return NextResponse.json(
        { message: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    const updatedPlan = await prisma.plan.update({
      where: { id: params.id },
      data: {
        isActive: !plan.isActive
      }
    })

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Erro ao alterar status do plano:', error)
    return NextResponse.json(
      { message: 'Erro ao alterar status do plano' },
      { status: 500 }
    )
  }
}