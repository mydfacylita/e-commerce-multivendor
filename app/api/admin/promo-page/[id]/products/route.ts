import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST - adicionar produto à promo
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { productId, customPrice, badgeText } = await req.json()
    if (!productId) return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 })

    // Contar posição atual
    const count = await prisma.promoProduct.count({ where: { promoPageId: params.id } })

    const pp = await prisma.promoProduct.create({
      data: { promoPageId: params.id, productId, customPrice, badgeText, position: count }
    })
    return NextResponse.json(pp, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Produto já está nesta promoção' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - remover produto da promo (?productId=xxx)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 })

    await prisma.promoProduct.deleteMany({ where: { promoPageId: params.id, productId } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - reordenar produtos [{ productId, position }]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const items: { productId: string; position: number; customPrice?: number; badgeText?: string }[] = await req.json()
    await Promise.all(items.map(item =>
      prisma.promoProduct.updateMany({
        where: { promoPageId: params.id, productId: item.productId },
        data: { position: item.position, customPrice: item.customPrice, badgeText: item.badgeText }
      })
    ))
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
