import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query.trim()) {
      return NextResponse.json({ products: [] })
    }

    // Buscar produtos por nome, SKU, GTIN ou marca
    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query } },
          { gtin: { contains: query } },
          { brand: { contains: query } },
          { id: { contains: query } },
        ]
      },
      select: {
        id: true,
        name: true,
        price: true,
        comparePrice: true,
        gtin: true,
        brand: true,
        images: true,
      },
      take: limit,
      orderBy: { name: 'asc' }
    })

    // Formatar resposta
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      comparePrice: p.comparePrice,
      gtin: p.gtin,
      brand: p.brand,
      sku: p.id.slice(-8).toUpperCase(), // Usar parte do ID como SKU se não tiver
    }))

    return NextResponse.json({ products: formattedProducts })

  } catch (error: any) {
    console.error('[Products Search] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produtos' },
      { status: 500 }
    )
  }
}
