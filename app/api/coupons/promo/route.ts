import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        showInModal: true,
        validFrom: { lte: now },
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } }
        ]
      },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
        maxDiscountValue: true,
        validUntil: true,
        promoImage: true,
        firstPurchaseOnly: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('[Promo Coupons] Erro:', error)
    return NextResponse.json({ coupons: [] })
  }
}
