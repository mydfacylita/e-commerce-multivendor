import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/batch?ids=id1,id2,id3
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids')
  if (!idsParam) {
    return NextResponse.json({ products: [] })
  }

  const ids = idsParam.split(',').filter(Boolean).slice(0, 100) // max 100

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
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
  })

  return NextResponse.json({ products })
}
