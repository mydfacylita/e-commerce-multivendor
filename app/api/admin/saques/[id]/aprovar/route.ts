import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Aprovar saque
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const withdrawalId = params.id
    const body = await req.json()
    const { adminNote } = body

    // Buscar saque
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        seller: {
          include: {
            user: true
          }
        }
      }
    })

    if (!withdrawal) {
      return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
    }

    // Verificar se está pendente
    if (withdrawal.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Apenas saques pendentes podem ser aprovados',
        currentStatus: withdrawal.status
      }, { status: 400 })
    }

    // Aprovar saque (sem deduzir saldo ainda - será deduzido ao COMPLETAR)
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'APPROVED',
        processedBy: session.user.id,
        processedAt: new Date(),
        adminNote,
        updatedAt: new Date()
      },
      include: {
        seller: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // TODO: Enviar notificação/email para o vendedor

    return NextResponse.json({ 
      success: true,
      message: 'Saque aprovado com sucesso',
      withdrawal: updatedWithdrawal
    })

  } catch (error) {
    console.error('Erro ao aprovar saque:', error)
    return NextResponse.json({ 
      error: 'Erro ao aprovar saque',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
