/**
 * GET /api/admin/ai-conversations
 * Lista as sessões de conversa entre clientes e a Mydi (IA).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const proactiveOnly = searchParams.get('proactive') === 'true'
  const cartOnly = searchParams.get('cart') === 'true'
  const checkoutOnly = searchParams.get('checkout') === 'true'
  const skip = (page - 1) * limit

  const where: any = {}
  if (proactiveOnly) where.wasProactive = true
  if (cartOnly) where.addedToCart = true
  if (checkoutOnly) where.wentToCheckout = true

  const db = prisma
  const [total, sessions] = await Promise.all([
    db.aiChatSession.count({ where }),
    db.aiChatSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        sessionId: true,
        pageUrl: true,
        pageTitle: true,
        messageCount: true,
        wasProactive: true,
        addedToCart: true,
        wentToCheckout: true,
        ipAddress: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  // Stats summary
  const [statsProactive, statsCart, statsCheckout, statsTotal] = await Promise.all([
    db.aiChatSession.count({ where: { wasProactive: true } }),
    db.aiChatSession.count({ where: { addedToCart: true } }),
    db.aiChatSession.count({ where: { wentToCheckout: true } }),
    db.aiChatSession.count(),
  ])

  return NextResponse.json({
    sessions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    stats: {
      total: statsTotal,
      proactive: statsProactive,
      addedToCart: statsCart,
      wentToCheckout: statsCheckout,
      proactiveRate: statsTotal > 0 ? Math.round((statsProactive / statsTotal) * 100) : 0,
      cartConversionRate: statsTotal > 0 ? Math.round((statsCart / statsTotal) * 100) : 0,
      checkoutRate: statsTotal > 0 ? Math.round((statsCheckout / statsTotal) * 100) : 0,
    },
  })
}
