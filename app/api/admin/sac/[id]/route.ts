import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/lib/whatsapp'

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
  const { action } = body

  // ── Ações especiais ─────────────────────────────────────────────────────────
  if (action === 'openSession') {
    // Envia template mydshop_abrir_chamado e marca sessionOpenedAt
    const ticket = await prisma.serviceTicket.findUnique({ where: { id: params.id } })
    if (!ticket) return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    if (!ticket.buyerPhone) return NextResponse.json({ error: 'Ticket sem telefone do comprador' }, { status: 400 })

    const t = ticket as any
    const protocol = t.protocol || ticket.id
    const buyerName = ticket.buyerName || 'Cliente'
    const components = [{
      type: 'body',
      parameters: [
        { type: 'text', text: buyerName },
        { type: 'text', text: protocol },
      ],
    }]

    await WhatsAppService.sendTemplate(ticket.buyerPhone, 'mydshop_abrir_chamado', 'pt_BR', components, {})
    const updated = await (prisma.serviceTicket.update as any)({
      where: { id: params.id },
      data: { sessionOpenedAt: new Date(), status: 'IN_PROGRESS', updatedAt: new Date() },
    })

    // Registrar mensagem enviada
    await prisma.ticketMessage.create({
      data: {
        ticketId:  params.id,
        direction: 'out',
        channel:   'whatsapp',
        content:   `[Template] mydshop_abrir_chamado — Protocolo ${protocol}`,
        status:    'sent',
      },
    })

    return NextResponse.json(updated)
  }

  if (action === 'closeSession') {
    const ticket = await prisma.serviceTicket.findUnique({ where: { id: params.id } })
    if (!ticket) return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })

    const protocol = (ticket as any).protocol || ticket.id
    const firstName = (ticket.buyerName || 'Cliente').split(' ')[0]

    // Enviar mensagem de encerramento via WhatsApp (funciona se sessão 24h ainda ativa)
    if (ticket.buyerPhone) {
      const closureMsg =
        `Olá ${firstName}! 👋 Seu atendimento foi encerrado com sucesso.\n` +
        `📋 Protocolo: *${protocol}*\n` +
        `Obrigado por entrar em contato com a MydShop. Caso precise de mais ajuda, estamos à disposição! 😊`
      try {
        const result = await WhatsAppService.sendMessage({
          to: ticket.buyerPhone,
          message: closureMsg,
          logType: 'sac_close',
        })
        await prisma.ticketMessage.create({
          data: {
            ticketId:   params.id,
            direction:  'out',
            channel:    'whatsapp',
            from:       'Atendente',
            content:    closureMsg,
            status:     result.success ? 'sent' : 'failed',
            externalId: result.messageId || null,
          },
        })
      } catch (_) {
        // falha silenciosa — encerra o ticket de qualquer forma
      }
    }

    const updated = await (prisma.serviceTicket.update as any)({
      where: { id: params.id },
      data: { sessionClosedAt: new Date(), status: 'CLOSED', closedAt: new Date(), updatedAt: new Date() },
    })
    return NextResponse.json(updated)
  }

  // ── Atualização de campos comuns ─────────────────────────────────────────────
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
