import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// POST - Marcar saque como concluído (pago)
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
    const { transactionId, adminNote } = body

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

    // Verificar se está aprovado
    if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
      return NextResponse.json({ 
        error: 'Apenas saques aprovados ou em processamento podem ser concluídos',
        currentStatus: withdrawal.status
      }, { status: 400 })
    }

    // Buscar conta digital do vendedor
    const sellerAccount = await prisma.sellerAccount.findUnique({
      where: { sellerId: withdrawal.sellerId }
    })

    // Marcar como concluído, deduzir saldo, desbloquear valor e atualizar transação
    const [updatedWithdrawal, updatedSeller] = await prisma.$transaction(async (tx) => {
      // 1. Atualizar saque para COMPLETED
      const withdrawal_ = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          transactionId,
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

      // 2. Deduzir saldo do vendedor e atualizar totalWithdrawn
      const seller_ = await tx.seller.update({
        where: { id: withdrawal.sellerId },
        data: {
          balance: { decrement: withdrawal.amount },
          totalWithdrawn: { increment: withdrawal.amount }
        }
      })

      // 3. Atualizar conta digital: decrementar balance e blockedBalance
      if (sellerAccount) {
        await tx.sellerAccount.update({
          where: { sellerId: withdrawal.sellerId },
          data: {
            balance: { decrement: withdrawal.amount },
            blockedBalance: { decrement: withdrawal.amount },
            totalWithdrawn: { increment: withdrawal.amount }
          }
        })

        // 4. Atualizar transação para COMPLETED
        await tx.sellerAccountTransaction.updateMany({
          where: {
            withdrawalId: withdrawalId,
            type: 'WITHDRAWAL',
            status: 'PENDING'
          },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            processedBy: session.user.id
          }
        })
      }

      return [withdrawal_, seller_]
    })

    // TODO: Enviar notificação/email para o vendedor

    return NextResponse.json({ 
      success: true,
      message: 'Saque marcado como concluído',
      withdrawal: updatedWithdrawal
    })

  } catch (error) {
    console.error('Erro ao concluir saque:', error)
    return NextResponse.json({ 
      error: 'Erro ao concluir saque',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
