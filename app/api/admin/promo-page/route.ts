import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - listar todas as promos
export async function GET() {
  try {
    const pages = await prisma.promoPage.findMany({
      orderBy: { createdAt: 'desc' },
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
              }
            }
          }
        }
      }
    })
    return NextResponse.json(pages)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - criar nova promo
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const data = await req.json()
    const { title, slug, description, bannerEnabled, bannerText, bannerBgColor, bannerTextColor,
            bannerLink, bannerImageUrl, isActive, startsAt, endsAt, couponCode, discountBadge } = data

    if (!title || !slug) {
      return NextResponse.json({ error: 'Título e slug são obrigatórios' }, { status: 400 })
    }

    // Se ativar essa, desativa as outras
    if (isActive) {
      await prisma.promoPage.updateMany({ where: { isActive: true }, data: { isActive: false } })
    }

    const page = await prisma.promoPage.create({
      data: {
        title,
        slug: slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description,
        bannerEnabled: bannerEnabled ?? true,
        bannerText,
        bannerBgColor: bannerBgColor || '#dc2626',
        bannerTextColor: bannerTextColor || '#ffffff',
        bannerLink,
        bannerImageUrl: bannerImageUrl || null,
        isActive: isActive ?? false,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        couponCode,
        discountBadge,
      }
    })
    return NextResponse.json(page, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Slug já existe' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
