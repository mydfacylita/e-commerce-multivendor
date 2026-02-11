import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// POST - Rejeitar saque
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
    const { rejectionReason, adminNote } = body

    if (!rejectionReason) {
      return NextResponse.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 })
    }

    // Buscar saque
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        seller: true
      }
    })

    if (!withdrawal) {
      return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
    }

    // Verificar se pode ser rejeitado
    if (!['PENDING', 'APPROVED'].includes(withdrawal.status)) {
      return NextResponse.json({ 
        error: 'Apenas saques pendentes ou aprovados podem ser rejeitados',
        currentStatus: withdrawal.status
      }, { status: 400 })
    }

    // Rejeitar saque e liberar valor bloqueado
    const updatedWithdrawal = await prisma.$transaction(async (tx) => {
      // 1. Rejeitar saque
      const withdrawal_ = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          rejectionReason,
          adminNote,
          processedBy: session.user.id,
          processedAt: new Date(),
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

      // 2. Desbloquear o valor na conta digital
      const sellerAccount = await tx.sellerAccount.findUnique({
        where: { sellerId: withdrawal.sellerId }
      })

      if (sellerAccount) {
        await tx.sellerAccount.update({
          where: { sellerId: withdrawal.sellerId },
          data: {
            blockedBalance: { decrement: withdrawal.amount }
          }
        })

        // 3. Cancelar a transação pendente
        await tx.sellerAccountTransaction.updateMany({
          where: {
            withdrawalId: withdrawalId,
            type: 'WITHDRAWAL',
            status: 'PENDING'
          },
          data: {
            status: 'CANCELLED',
            processedAt: new Date(),
            processedBy: session.user.id
          }
        })
      }

      return withdrawal_
    })

    // TODO: Enviar notificação/email para o vendedor

    return NextResponse.json({ 
      success: true,
      message: 'Saque rejeitado com sucesso. O valor bloqueado foi liberado.',
      withdrawal: updatedWithdrawal
    })

  } catch (error) {
    console.error('Erro ao rejeitar saque:', error)
    return NextResponse.json({ 
      error: 'Erro ao rejeitar saque',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
