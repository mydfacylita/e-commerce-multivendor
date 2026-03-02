/**
 * DELETE /api/admin/carne/[id]  — Remove um carnê
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const carne = await prisma.carne.findUnique({ where: { id: params.id } })
  if (!carne) return NextResponse.json({ error: 'Carnê não encontrado' }, { status: 404 })

  await prisma.carne.delete({ where: { id: params.id } })

  // Revert order payment method
  await prisma.order.update({
    where: { id: carne.orderId },
    data: { paymentMethod: 'boleto', paymentStatus: 'PENDING' },
  })

  return NextResponse.json({ ok: true })
}
