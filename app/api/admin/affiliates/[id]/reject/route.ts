import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const affiliateId = params.id
    const body = await request.json()
    const { reason } = body

    // Rejeitar afiliado
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        status: 'REJECTED',
        isActive: false,
        notes: reason || 'Rejeitado pelo administrador'
      }
    })

    // TODO: Enviar email de rejeição ao afiliado

    return NextResponse.json({
      success: true,
      message: 'Afiliado rejeitado',
      affiliate
    })

  } catch (error) {
    console.error('Erro ao rejeitar afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao rejeitar afiliado' },
      { status: 500 }
    )
  }
}
