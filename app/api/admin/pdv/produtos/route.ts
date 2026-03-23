import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Busca rápida de produtos para o PDV (por nome, código, gtin)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  if (q.length < 2) return NextResponse.json([])

  const produtos = await prisma.product.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: q } },
        { gtin: { contains: q } },
        { id: { contains: q } }
      ]
    },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      gtin: true,
      images: true,
    },
    take: 10
  })

  return NextResponse.json(produtos)
}
