import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Busca produtos similares de outros fornecedores
 * Útil para trocar um produto por equivalente de outro fornecedor
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const query = searchParams.get('q') || ''
    const excludeSupplierId = searchParams.get('excludeSupplierId')

    if (!productId && !query) {
      return NextResponse.json(
        { error: 'Informe productId ou query de busca' },
        { status: 400 }
      )
    }

    let searchTerms: string[] = []
    let originalProduct: any = null
    let categoryId: string | null = null

    // Se tiver productId, buscar o produto original para extrair termos de busca
    if (productId) {
      originalProduct = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          categoryId: true,
          supplierId: true,
          brand: true,
          gtin: true,
          price: true,
          costPrice: true,
        }
      })

      if (originalProduct) {
        // Extrair palavras-chave do nome do produto
        const nameParts = originalProduct.name
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3) // Palavras com mais de 3 caracteres
          .slice(0, 5) // Primeiras 5 palavras significativas

        searchTerms = nameParts
        categoryId = originalProduct.categoryId
      }
    } else if (query) {
      searchTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    }

    // Construir condições de busca
    const whereConditions: any = {
      active: true,
      isDropshipping: true,
      // Excluir o próprio produto
      ...(productId && { NOT: { id: productId } }),
      // Excluir produtos do mesmo fornecedor
      ...(excludeSupplierId && { NOT: { supplierId: excludeSupplierId } }),
      ...(originalProduct?.supplierId && !excludeSupplierId && { 
        NOT: { supplierId: originalProduct.supplierId } 
      }),
    }

    // Adicionar condições de busca por termos
    if (searchTerms.length > 0) {
      whereConditions.OR = searchTerms.map(term => ({
        name: { contains: term }
      }))
    }

    // Se tiver mesma categoria, priorizar
    if (categoryId) {
      whereConditions.categoryId = categoryId
    }

    // Buscar produtos similares
    let similarProducts = await prisma.product.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        images: true,
        stock: true,
        supplierSku: true,
        supplierId: true,
        supplierStoreName: true,
        isChoiceProduct: true,
        supplier: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      take: 20,
      orderBy: [
        { name: 'asc' }
      ]
    })

    // Se não encontrou na mesma categoria, buscar em todas as categorias
    if (similarProducts.length === 0 && categoryId) {
      delete whereConditions.categoryId
      
      similarProducts = await prisma.product.findMany({
        where: whereConditions,
        select: {
          id: true,
          name: true,
          price: true,
          costPrice: true,
          images: true,
          stock: true,
          supplierSku: true,
          supplierId: true,
          supplierStoreName: true,
          isChoiceProduct: true,
          supplier: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        take: 20,
        orderBy: [
          { name: 'asc' }
        ]
      })
    }

    // Formatar resposta
    const formattedProducts = similarProducts.map(p => {
      let firstImage = '/placeholder.png'
      try {
        const images = JSON.parse(p.images || '[]')
        firstImage = Array.isArray(images) && images.length > 0 ? images[0] : '/placeholder.png'
      } catch {
        firstImage = p.images || '/placeholder.png'
      }

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        costPrice: p.costPrice,
        image: firstImage,
        stock: p.stock,
        supplierSku: p.supplierSku,
        supplierId: p.supplierId,
        supplierName: p.supplier?.name || p.supplierStoreName || 'Sem fornecedor',
        isChoiceProduct: p.isChoiceProduct,
      }
    })

    return NextResponse.json({
      originalProduct: originalProduct ? {
        id: originalProduct.id,
        name: originalProduct.name,
        price: originalProduct.price,
        costPrice: originalProduct.costPrice,
      } : null,
      searchTerms,
      products: formattedProducts,
      total: formattedProducts.length
    })

  } catch (error: any) {
    console.error('[Find Similar Products] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produtos similares' },
      { status: 500 }
    )
  }
}
