import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      productIds,         // array de IDs selecionados manualmente (tem prioridade)
      sourceCategoryId,   // categoria de origem (null = todos os produtos)
      targetCategoryId,   // categoria destino (obrigatório)
      supplierId,         // filtro opcional por fornecedor
      onlyInactive,       // apenas inativos
    } = body

    if (!targetCategoryId) {
      return NextResponse.json({ error: 'Categoria destino obrigatória' }, { status: 400 })
    }

    // Confirmar que a categoria destino existe
    const targetCategory = await prisma.category.findUnique({
      where: { id: targetCategoryId },
    })
    if (!targetCategory) {
      return NextResponse.json({ error: 'Categoria destino não encontrada' }, { status: 404 })
    }

    // Se vieram IDs específicos, usa eles diretamente
    let where: any = {}

    if (Array.isArray(productIds) && productIds.length > 0) {
      where.id = { in: productIds }
    } else {
      // Construir filtro de categoria de origem (inclui subcategorias)
      where.sellerId = null

      if (sourceCategoryId) {
        const getAllChildIds = async (parentId: string): Promise<string[]> => {
          const children = await prisma.category.findMany({
            where: { parentId },
            select: { id: true },
          })
          let ids = [parentId]
          for (const child of children) {
            ids = [...ids, ...(await getAllChildIds(child.id))]
          }
          return ids
        }
        const categoryIds = await getAllChildIds(sourceCategoryId)
        where.categoryId = { in: categoryIds }
      }

      if (supplierId) where.supplierId = supplierId
      if (onlyInactive) where.active = false
    }

    // Buscar produtos para preview / contagem
    const count = await prisma.product.count({ where })

    if (count === 0) {
      return NextResponse.json({ success: false, message: 'Nenhum produto encontrado com os filtros selecionados', updated: 0 })
    }

    // Executar atualização em massa
    const result = await prisma.product.updateMany({
      where,
      data: { categoryId: targetCategoryId },
    })

    return NextResponse.json({
      success: true,
      message: `${result.count} produto(s) movido(s) para "${targetCategory.name}" com sucesso!`,
      updated: result.count,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar categoria em massa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 })
  }
}

// Preview: quantos produtos serão afetados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sourceCategoryId = searchParams.get('sourceCategoryId')
    const supplierId = searchParams.get('supplierId')
    const onlyInactive = searchParams.get('onlyInactive') === 'true'

    let where: any = { sellerId: null }

    if (sourceCategoryId) {
      const getAllChildIds = async (parentId: string): Promise<string[]> => {
        const children = await prisma.category.findMany({
          where: { parentId },
          select: { id: true },
        })
        let ids = [parentId]
        for (const child of children) {
          ids = [...ids, ...(await getAllChildIds(child.id))]
        }
        return ids
      }
      const categoryIds = await getAllChildIds(sourceCategoryId)
      where.categoryId = { in: categoryIds }
    }

    if (supplierId) where.supplierId = supplierId
    if (onlyInactive) where.active = false

    const count = await prisma.product.count({ where })
    return NextResponse.json({ count })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
