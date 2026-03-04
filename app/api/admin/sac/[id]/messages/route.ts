import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/lib/whatsapp'
import { sendSimpleEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// GET /api/admin/sac/[id]/messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const messages = await prisma.ticketMessage.findMany({
    where: { ticketId: params.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ messages })
}

// POST /api/admin/sac/[id]/messages — enviar mensagem
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { channel, content, subject, templateId, templateParams } = body

  if (!channel || !content) {
    return NextResponse.json({ error: 'canal e conteúdo são obrigatórios' }, { status: 400 })
  }

  const ticket = await prisma.serviceTicket.findUnique({ where: { id: params.id } })
  if (!ticket) return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })

  const agentName = (session.user as any).name || 'Atendente'
  let externalId: string | null = null
  let status = 'sent'
  let errorMsg: string | null = null

  try {
    if (channel === 'whatsapp') {
      if (!ticket.buyerPhone) throw new Error('Telefone do cliente não informado')

      if (templateId && templateParams) {
        // Envio via template
        const result = await WhatsAppService.sendTemplate(ticket.buyerPhone, templateId, templateParams)
        externalId = result?.messages?.[0]?.id || null
      } else {
        // Mensagem de texto livre (sessão ativa necessária)
        const result = await WhatsAppService.sendMessage({
          to: ticket.buyerPhone,
          message: content,
          logType: 'sac_message',
          logOrderId: ticket.orderId || undefined,
        })
        externalId = result?.messages?.[0]?.id || null
      }
    } else if (channel === 'email') {
      if (!ticket.buyerEmail) throw new Error('E-mail do cliente não informado')

      await sendSimpleEmail(
        ticket.buyerEmail,
        subject || ticket.subject,
        content,
      )
    }
    // 'internal' = só registra internamente, não envia nada
  } catch (e: any) {
    status = 'failed'
    errorMsg = e?.message || 'Erro desconhecido'
    console.error(`⚠️ SAC message failed (${channel}):`, errorMsg)
  }

  // Salvar mensagem no ticket
  const message = await prisma.ticketMessage.create({
    data: {
      ticketId:   params.id,
      channel,
      direction:  'out',
      from:       agentName,
      content,
      templateId: templateId || null,
      status,
      externalId,
    },
  })

  // Atualizar updatedAt do ticket
  await prisma.serviceTicket.update({
    where: { id: params.id },
    data: { updatedAt: new Date(), status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status },
  })

  if (status === 'failed') {
    return NextResponse.json({ message, error: errorMsg }, { status: 207 })
  }

  return NextResponse.json({ message }, { status: 201 })
}
