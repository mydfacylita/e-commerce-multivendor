import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/categories/[id]/products/count
// Retorna a quantidade de produtos ativos em uma categoria (incluindo subcategorias)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id

    if (!categoryId) {
      return NextResponse.json({ count: 0 })
    }

    // Buscar subcategorias da categoria pai
    const subcategories = await prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true }
    })

    const subcategoryIds = subcategories.map(s => s.id)

    // Contar produtos ativos na categoria pai + subcategorias
    const count = await prisma.product.count({
      where: {
        categoryId: { in: [categoryId, ...subcategoryIds] },
        active: true,
        stock: { gt: 0 }
      }
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Erro ao contar produtos da categoria:', error)
    return NextResponse.json({ count: 0 })
  }
}
