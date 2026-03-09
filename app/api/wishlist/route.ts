import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — lista todos os produtos na wishlist do usuário logado
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          stock: true,
          active: true,
          category: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ items })
}

// POST — adiciona produto à wishlist
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { productId } = await request.json()
  if (!productId) {
    return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 })
  }

  const item = await prisma.wishlist.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    update: {},
    create: { userId: session.user.id, productId }
  })

  return NextResponse.json({ success: true, item })
}

// DELETE — remove produto da wishlist
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { productId } = await request.json()
  if (!productId) {
    return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 })
  }

  await prisma.wishlist.deleteMany({
    where: { userId: session.user.id, productId }
  })

  return NextResponse.json({ success: true })
}
