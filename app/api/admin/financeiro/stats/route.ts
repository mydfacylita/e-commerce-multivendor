import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Estatísticas de pagamentos
    const [approved, pending, refunds, orders] = await Promise.all([
      // Total aprovado
      prisma.order.aggregate({
        where: {
          paymentStatus: 'approved',
          status: { not: 'CANCELLED' }
        },
        _sum: { total: true }
      }),
      // Total pendente
      prisma.order.aggregate({
        where: {
          status: 'PENDING'
        },
        _sum: { total: true }
      }),
      // Total estornado (da tabela de refunds)
      prisma.refund.aggregate({
        where: {
          status: 'approved'
        },
        _sum: { amount: true }
      }),
      // Buscar pedidos com paymentId para verificar duplicados
      prisma.order.findMany({
        where: {
          paymentId: { not: null }
        },
        select: {
          id: true,
          paymentId: true,
          total: true,
          paymentStatus: true
        }
      })
    ])

    // Identificar duplicados (mesmo paymentId em múltiplos pedidos)
    const paymentIdMap = new Map<string, number>()
    orders.forEach(order => {
      if (order.paymentId) {
        paymentIdMap.set(order.paymentId, (paymentIdMap.get(order.paymentId) || 0) + 1)
      }
    })
    const duplicatesCount = Array.from(paymentIdMap.values()).filter(count => count > 1).length

    return NextResponse.json({
      totalApproved: approved._sum.total || 0,
      totalPending: pending._sum.total || 0,
      totalRefunded: refunds._sum.amount || 0,
      duplicatesCount
    })

  } catch (error) {
    console.error('Erro ao carregar estatísticas financeiras:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
