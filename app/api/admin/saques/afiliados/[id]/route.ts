import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { action, adminNote, rejectionReason, transactionId } = await req.json()

    const withdrawal = await prisma.affiliateWithdrawal.findUnique({
      where: { id: params.id },
      include: { affiliate: { include: { account: true } } }
    })

    if (!withdrawal) return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })

    if (action === 'aprovar') {
      if (withdrawal.status !== 'PENDING') {
        return NextResponse.json({ error: 'Apenas saques pendentes podem ser aprovados' }, { status: 400 })
      }
      await prisma.affiliateWithdrawal.update({
        where: { id: params.id },
        data: { status: 'APPROVED', notes: adminNote || null, processedBy: session.user.id }
      })
      return NextResponse.json({ success: true, message: 'Saque aprovado' })
    }

    if (action === 'rejeitar') {
      if (!['PENDING', 'APPROVED'].includes(withdrawal.status)) {
        return NextResponse.json({ error: 'Saque não pode ser rejeitado neste status' }, { status: 400 })
      }
      // Devolver saldo ao afiliado
      if (withdrawal.affiliate.account) {
        await prisma.$transaction([
          prisma.affiliateWithdrawal.update({
            where: { id: params.id },
            data: { status: 'REJECTED', rejectionReason, rejectedAt: new Date(), processedBy: session.user.id }
          }),
          prisma.sellerAccount.update({
            where: { id: withdrawal.affiliate.account.id },
            data: {
              balance: { increment: withdrawal.amount },
              totalWithdrawn: { decrement: withdrawal.amount }
            }
          }),
          prisma.affiliate.update({
            where: { id: withdrawal.affiliateId },
            data: { totalWithdrawn: { decrement: withdrawal.amount } }
          })
        ])
      } else {
        await prisma.affiliateWithdrawal.update({
          where: { id: params.id },
          data: { status: 'REJECTED', rejectionReason, rejectedAt: new Date(), processedBy: session.user.id }
        })
      }
      return NextResponse.json({ success: true, message: 'Saque rejeitado e saldo devolvido' })
    }

    if (action === 'concluir') {
      if (!['APPROVED', 'PROCESSING'].includes(withdrawal.status)) {
        return NextResponse.json({ error: 'Saque não pode ser concluído neste status' }, { status: 400 })
      }
      await prisma.affiliateWithdrawal.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: session.user.id,
          notes: [withdrawal.notes, transactionId ? `Transação: ${transactionId}` : null, adminNote].filter(Boolean).join('\n') || null
        }
      })
      return NextResponse.json({ success: true, message: 'Saque concluído' })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao processar saque de afiliado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
