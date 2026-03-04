import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/sac/search?q=...
// Busca clientes e pedidos para criar/associar um ticket
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const q = new URL(req.url).searchParams.get('q') || ''
  if (q.length < 3) return NextResponse.json({ orders: [], users: [] })

  const [orders, users] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { id:          { contains: q } },
          { buyerName:   { contains: q } },
          { buyerEmail:  { contains: q } },
          { buyerPhone:  { contains: q } },
          { buyerCpf:    { contains: q } },
          { trackingCode:{ contains: q } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, status: true, total: true, createdAt: true,
        buyerName: true, buyerEmail: true, buyerPhone: true, buyerCpf: true,
        paymentMethod: true, paymentStatus: true, trackingCode: true,
      },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name:  { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { cpf:   { contains: q } },
        ],
      },
      take: 5,
      select: { id: true, name: true, email: true, phone: true, cpf: true, createdAt: true },
    }),
  ])

  return NextResponse.json({ orders, users })
}
