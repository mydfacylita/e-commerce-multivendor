import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/sac/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const ticket = await prisma.serviceTicket.findUnique({
    where: { id: params.id },
    include: {
      messages:     { orderBy: { createdAt: 'asc' } },
      negotiations: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })

  // Pedido relacionado
  let order = null
  if (ticket.orderId) {
    order = await prisma.order.findUnique({
      where: { id: ticket.orderId },
      select: {
        id: true, status: true, total: true, subtotal: true, discountAmount: true,
        paymentMethod: true, paymentStatus: true, createdAt: true,
        buyerName: true, buyerEmail: true, buyerPhone: true, buyerCpf: true,
        cancelReason: true, shippingAddress: true, trackingCode: true,
        items: {
          include: { product: { select: { id: true, name: true, images: true } } }
        },
      },
    })
  }

  // Outros pedidos do mesmo comprador (últimos 5)
  const otherOrders = ticket.buyerEmail || ticket.buyerPhone
    ? await prisma.order.findMany({
        where: {
          OR: [
            ticket.buyerEmail ? { buyerEmail: ticket.buyerEmail } : {},
            ticket.buyerPhone ? { buyerPhone: ticket.buyerPhone } : {},
          ].filter(x => Object.keys(x).length > 0),
          id: { not: ticket.orderId || undefined },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, status: true, total: true, createdAt: true, paymentMethod: true },
      })
    : []

  // Histórico de notificações do cliente
  const notificationHistory = ticket.buyerEmail || ticket.buyerPhone
    ? await prisma.notificationLog.findMany({
        where: {
          OR: [
            ticket.buyerEmail ? { to: ticket.buyerEmail } : {},
            ticket.buyerPhone ? { to: ticket.buyerPhone } : {},
          ].filter(x => Object.keys(x).length > 0),
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    : []

  return NextResponse.json({ ticket, order, otherOrders, notificationHistory })
}

// PATCH /api/admin/sac/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const updateData: any = {}

  const allowed = ['status', 'priority', 'category', 'subject', 'assignedTo', 'tags',
                   'buyerName', 'buyerEmail', 'buyerPhone', 'buyerCpf', 'orderId']
  for (const key of allowed) {
    if (key in body) updateData[key] = body[key]
  }

  if (body.status === 'RESOLVED') updateData.resolvedAt = new Date()
  if (body.status === 'CLOSED')   updateData.closedAt   = new Date()

  const ticket = await prisma.serviceTicket.update({
    where: { id: params.id },
    data: { ...updateData, updatedAt: new Date() },
  })

  return NextResponse.json(ticket)
}

// DELETE /api/admin/sac/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  await prisma.serviceTicket.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
