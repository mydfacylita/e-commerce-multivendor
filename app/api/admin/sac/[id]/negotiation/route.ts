import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// GET /api/admin/sac/[id]/negotiation
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const deals = await prisma.negotiationDeal.findMany({
    where: { ticketId: params.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ deals })
}

// POST /api/admin/sac/[id]/negotiation — criar proposta
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const {
    type, orderId,
    originalAmount, negotiatedAmount, discountPct, installments,
    dueDate, notes, sendWhatsApp, sendEmail, termsText
  } = body

  if (!type) return NextResponse.json({ error: 'Tipo de negociação obrigatório' }, { status: 400 })

  const ticket = await prisma.serviceTicket.findUnique({ where: { id: params.id } })
  if (!ticket) return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })

  // Calcular desconto se não foi passado
  let calcDiscountPct = discountPct
  if (!calcDiscountPct && originalAmount && negotiatedAmount) {
    calcDiscountPct = ((originalAmount - negotiatedAmount) / originalAmount) * 100
  }

  const deal = await prisma.negotiationDeal.create({
    data: {
      ticketId:         params.id,
      orderId:          orderId || ticket.orderId || null,
      type,
      status:           'PROPOSED',
      originalAmount:   originalAmount  ? parseFloat(originalAmount)  : null,
      negotiatedAmount: negotiatedAmount ? parseFloat(negotiatedAmount) : null,
      discountPct:      calcDiscountPct ? parseFloat(String(calcDiscountPct)) : null,
      installments:     installments    ? parseInt(installments)    : 1,
      dueDate:          dueDate         ? new Date(dueDate)         : null,
      notes:            notes           || null,
      terms:            termsText       ? JSON.stringify({ text: termsText }) : null,
      createdBy:        (session.user as any).name || (session.user as any).email || 'Admin',
    },
  })

  // Marcar ticket como em negociação
  await prisma.serviceTicket.update({
    where: { id: params.id },
    data: { status: 'NEGOTIATING', hasNegotiation: true, updatedAt: new Date() },
  })

  // Registrar internamente como mensagem no ticket
  const summaryLines: string[] = [
    `📋 Proposta de negociação criada`,
    `Tipo: ${type}`,
    originalAmount  ? `Valor original: R$ ${parseFloat(String(originalAmount)).toFixed(2)}` : '',
    negotiatedAmount ? `Valor negociado: R$ ${parseFloat(String(negotiatedAmount)).toFixed(2)}` : '',
    calcDiscountPct ? `Desconto: ${parseFloat(String(calcDiscountPct)).toFixed(1)}%` : '',
    installments > 1 ? `Parcelas: ${installments}x` : '',
    dueDate ? `Vencimento: ${new Date(dueDate).toLocaleDateString('pt-BR')}` : '',
    notes ? `Obs: ${notes}` : '',
  ].filter(Boolean)

  await prisma.ticketMessage.create({
    data: {
      ticketId:  params.id,
      channel:   'internal',
      direction: 'out',
      from:      (session.user as any).name || 'Admin',
      content:   summaryLines.join('\n'),
      status:    'sent',
    },
  })

  // Enviar via WhatsApp se solicitado
  if (sendWhatsApp && ticket.buyerPhone) {
    const msgLines: string[] = [
      `Olá ${ticket.buyerName || 'cliente'}! 👋`,
      ``,
      `Preparamos uma proposta especial para você:`,
      originalAmount   ? `💰 Valor original: R$ ${parseFloat(String(originalAmount)).toFixed(2)}` : '',
      negotiatedAmount ? `✅ Valor negociado: R$ ${parseFloat(String(negotiatedAmount)).toFixed(2)}` : '',
      calcDiscountPct  ? `🏷️ Desconto de ${parseFloat(String(calcDiscountPct)).toFixed(1)}%` : '',
      installments > 1 ? `📅 Em ${installments}x parcelas` : '',
      dueDate ? `⏰ Válido até: ${new Date(dueDate).toLocaleDateString('pt-BR')}` : '',
      notes   ? `\n${notes}` : '',
      `\nResponda esta mensagem para confirmar ou tirar dúvidas.`,
    ].filter(x => x !== '')

    WhatsAppService.sendMessage({
      to: ticket.buyerPhone,
      message: msgLines.join('\n'),
      logType: 'sac_negotiation',
      logOrderId: orderId || ticket.orderId || undefined,
    }).catch((e: any) => console.error('⚠️ WhatsApp negociação falhou:', e?.message))
  }

  return NextResponse.json({ deal }, { status: 201 })
}

// PATCH /api/admin/sac/[id]/negotiation?dealId=xxx — atualizar status do deal
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { dealId, status } = body

  if (!dealId || !status) return NextResponse.json({ error: 'dealId e status obrigatórios' }, { status: 400 })

  const deal = await prisma.negotiationDeal.update({
    where: { id: dealId },
    data: {
      status,
      executedAt: status === 'EXECUTED' ? new Date() : undefined,
      updatedAt:  new Date(),
    },
  })

  // Atualizar ticket
  const newTicketStatus = status === 'EXECUTED' ? 'RESOLVED' : status === 'REJECTED' ? 'IN_PROGRESS' : undefined
  if (newTicketStatus) {
    await prisma.serviceTicket.update({
      where: { id: params.id },
      data: { status: newTicketStatus, resolvedAt: newTicketStatus === 'RESOLVED' ? new Date() : undefined },
    })
  }

  return NextResponse.json({ deal })
}
