import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const withdrawals = await prisma.affiliateWithdrawal.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        affiliate: {
          select: {
            id: true,
            name: true,
            email: true,
            chavePix: true,
            banco: true,
            agencia: true,
            conta: true,
            tipoConta: true,
            account: {
              select: { accountNumber: true, balance: true }
            }
          }
        }
      }
    })

    const stats = await prisma.affiliateWithdrawal.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true }
    })

    return NextResponse.json({ withdrawals, stats })
  } catch (error) {
    console.error('Erro ao buscar saques de afiliados:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
