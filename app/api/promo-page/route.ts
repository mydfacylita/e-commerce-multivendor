import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - buscar promo ativa (usada pelo banner e página pública)
export async function GET() {
  try {
    const now = new Date()
    const page = await prisma.promoPage.findFirst({
      where: {
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } }
            ]
          }
        ]
      },
      include: {
        products: {
          orderBy: { position: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                active: true,
                slug: true,
                shipFromCountry: true,
                supplierCountryCode: true,
              }
            }
          }
        }
      }
    })

    if (!page) return NextResponse.json({ active: false })

    // Filtrar apenas produtos ativos
    const products = page.products.filter(pp => pp.product.active)

    return NextResponse.json({
      active: true,
      id: page.id,
      title: page.title,
      slug: page.slug,
      description: page.description,
      banner: {
        enabled: page.bannerEnabled,
        text: page.bannerText,
        bgColor: page.bannerBgColor,
        textColor: page.bannerTextColor,
        link: page.bannerLink,
        imageUrl: page.bannerImageUrl,
      },
      couponCode: page.couponCode,
      discountBadge: page.discountBadge,
      endsAt: page.endsAt,
      products: products.map(pp => ({
        ...pp.product,
        images: typeof pp.product.images === 'string' ? JSON.parse(pp.product.images || '[]') : (pp.product.images || []),
        customPrice: pp.customPrice,
        badgeText: pp.badgeText,
        position: pp.position,
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
