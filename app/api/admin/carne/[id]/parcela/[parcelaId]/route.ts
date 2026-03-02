/**
 * PATCH /api/admin/carne/[id]/parcela/[parcelaId]
 *   — Atualiza status de uma parcela (PAID, CANCELLED, PENDING)
 * DELETE /api/admin/carne/[id]
 *   — Remove carnê (volta paymentMethod do pedido para o original)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; parcelaId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { status, notes } = await request.json()
  if (!['PAID', 'CANCELLED', 'PENDING', 'OVERDUE'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const parcela = await prisma.carneParcela.update({
    where: { id: params.parcelaId },
    data: {
      status,
      paidAt: status === 'PAID' ? new Date() : null,
      paidBy: status === 'PAID' ? ((session.user as any)?.name || (session.user as any)?.email || 'Admin') : null,
      notes: notes ?? undefined,
    },
    include: { carne: { include: { parcelas: true } } },
  })

  // Se todas pagas → pedido PAID
  const todasPagas = parcela.carne.parcelas.every(p => p.id === params.parcelaId ? status === 'PAID' : p.status === 'PAID')
  if (todasPagas) {
    await prisma.order.update({
      where: { id: parcela.carne.orderId },
      data: { paymentStatus: 'PAID', paymentApprovedAt: new Date(), status: 'PROCESSING' },
    })
  } else {
    // Garantir que pedido volta para PENDING se uma parcela for desmarcada
    const currentOrder = await prisma.order.findUnique({ where: { id: parcela.carne.orderId }, select: { paymentStatus: true } })
    if (currentOrder?.paymentStatus === 'PAID' && status !== 'PAID') {
      await prisma.order.update({
        where: { id: parcela.carne.orderId },
        data: { paymentStatus: 'PENDING', paymentApprovedAt: null },
      })
    }
  }

  return NextResponse.json({ parcela })
}
