import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/sac — listar tickets
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page') || '1')
  const limit  = parseInt(searchParams.get('limit') || '30')
  const status = searchParams.get('status') || undefined
  const q      = searchParams.get('q') || ''
  const skip   = (page - 1) * limit

  const where: any = {}
  if (status) where.status = status
  if (q) {
    where.OR = [
      { buyerName:  { contains: q } },
      { buyerEmail: { contains: q } },
      { buyerPhone: { contains: q } },
      { buyerCpf:   { contains: q } },
      { subject:    { contains: q } },
      { orderId:    { contains: q } },
    ]
  }

  const [tickets, total] = await Promise.all([
    prisma.serviceTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { messages: true, negotiations: true } },
      },
    }),
    prisma.serviceTicket.count({ where }),
  ])

  return NextResponse.json({ tickets, total, page, limit })
}

// POST /api/admin/sac — criar ticket
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { buyerName, buyerEmail, buyerPhone, buyerCpf, orderId, subject, category, priority, userId } = body

  if (!subject) {
    return NextResponse.json({ error: 'Assunto é obrigatório' }, { status: 400 })
  }

  // Se passou orderId, busca dados do pedido
  let orderData: any = null
  if (orderId) {
    orderData = await prisma.order.findUnique({
      where: { id: orderId },
      select: { buyerName: true, buyerEmail: true, buyerPhone: true, buyerCpf: true, userId: true, total: true },
    })
  }

  const ticket = await prisma.serviceTicket.create({
    data: {
      userId:     userId || orderData?.userId  || null,
      buyerName:  buyerName  || orderData?.buyerName  || null,
      buyerEmail: buyerEmail || orderData?.buyerEmail || null,
      buyerPhone: buyerPhone || orderData?.buyerPhone || null,
      buyerCpf:   buyerCpf   || orderData?.buyerCpf   || null,
      orderId:    orderId    || null,
      subject,
      category:  category  || 'OUTRO',
      priority:  priority  || 'NORMAL',
      status:    'OPEN',
      assignedTo: (session.user as any).name || (session.user as any).email || 'Admin',
    },
  })

  return NextResponse.json(ticket, { status: 201 })
}
