import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - buscar promo específica
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const page = await prisma.promoPage.findUnique({
      where: { id: params.id },
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
    if (!page) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json(page)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - atualizar promo
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const data = await req.json()

    // Se ativar essa, desativa as outras
    if (data.isActive) {
      await prisma.promoPage.updateMany({
        where: { isActive: true, id: { not: params.id } },
        data: { isActive: false }
      })
    }

    const page = await prisma.promoPage.update({
      where: { id: params.id },
      data: {
        title: data.title,
        slug: data.slug?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: data.description,
        bannerEnabled: data.bannerEnabled,
        bannerText: data.bannerText,
        bannerBgColor: data.bannerBgColor,
        bannerTextColor: data.bannerTextColor,
        bannerLink: data.bannerLink,
        bannerImageUrl: data.bannerImageUrl || null,
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        couponCode: data.couponCode,
        discountBadge: data.discountBadge,
      }
    })
    return NextResponse.json(page)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - excluir promo
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    await prisma.promoPage.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
