import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/ean/products-without-ean
 * Lista produtos que não têm código EAN atribuído
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar produtos sem GTIN (código EAN)
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { gtin: null },
          { gtin: '' }
        ],
        active: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        stock: true,
        images: true
      },
      orderBy: {
        name: 'asc'
      },
      take: 100 // Limitar a 100 produtos
    })

    // Serializar dados
    const serializedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      stock: p.stock,
      image: p.images ? JSON.parse(p.images)[0] : null
    }))

    return NextResponse.json({ products: serializedProducts })

  } catch (error: any) {
    console.error('Erro ao buscar produtos sem EAN:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar produtos' },
      { status: 500 }
    )
  }
}
