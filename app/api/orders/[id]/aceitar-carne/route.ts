/**
 * POST /api/orders/[id]/aceitar-carne
 * Cliente aceita a proposta de financiamento (carnê) do pedido.
 * Muda o pedido de PENDING → PROCESSING com paymentStatus='financing'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const orderId = params.id

  // Verificar que o pedido pertence ao usuário logado
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { carne: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  if (order.userId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  if (!order.carne) {
    return NextResponse.json({ error: 'Este pedido não possui carnê' }, { status: 400 })
  }

  if (order.carne.financingAcceptedAt) {
    return NextResponse.json({ error: 'Financiamento já foi aceito anteriormente' }, { status: 409 })
  }

  // Capturar IP do cliente
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'

  // Marcar aceite no carnê
  await prisma.carne.update({
    where: { id: order.carne.id },
    data: {
      financingAcceptedAt: new Date(),
      financingAcceptedIp: ip,
    },
  })

  // Pedido passa para PROCESSING / paymentStatus = 'financing'
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PROCESSING',
      paymentStatus: 'financing',
      paymentApprovedAt: new Date(),
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Financiamento aceito com sucesso!',
    order: {
      id: updatedOrder.id,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const orderId = params.id

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { carne: true },
  })

  if (!order || order.userId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Pedido não encontrado ou sem permissão' }, { status: 403 })
  }

  if (!order.carne || order.carne.financingAcceptedAt) {
    return NextResponse.json({ error: 'Não é possível recusar' }, { status: 400 })
  }

  // Cliente recusa: volta o pedido ao PENDING normal sem paymentMethod=carne
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentMethod: null, paymentStatus: 'PENDING' },
  })

  // Remove o carnê
  await prisma.carne.delete({ where: { id: order.carne.id } })

  return NextResponse.json({ success: true, message: 'Financiamento recusado' })
}
