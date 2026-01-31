import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// POST /api/products/stock - Buscar estoque de produtos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds é obrigatório' }, { status: 400 })
    }

    // Limpar IDs (remover sufixos de variante se houver)
    const cleanIds = productIds.map((id: string) => {
      const parts = id.split('_')
      return parts[0]
    })

    // Buscar produtos com estoque e variantes
    const products = await prisma.product.findMany({
      where: {
        id: { in: cleanIds }
      },
      select: {
        id: true,
        name: true,
        stock: true,
        variants: true
      }
    })

    // Montar resposta com estoque
    const stockData: Record<string, {
      stock: number
      variants?: Array<{ size: string; color: string; stock: number }>
    }> = {}

    for (const product of products) {
      // Parse variants - pode ser array, string JSON, ou null
      let variants: Array<{ size?: string; color?: string; stock?: number }> | null = null
      
      if (product.variants) {
        if (Array.isArray(product.variants)) {
          variants = product.variants
        } else if (typeof product.variants === 'string') {
          try {
            const parsed = JSON.parse(product.variants)
            variants = Array.isArray(parsed) ? parsed : null
          } catch {
            variants = null
          }
        }
      }
      
      stockData[product.id] = {
        stock: product.stock,
        variants: variants?.map(v => ({
          size: v.size || '',
          color: v.color || '',
          stock: v.stock || 0
        }))
      }
    }

    console.log('📦 [Stock API] Estoque consultado para', products.length, 'produtos')

    return NextResponse.json(stockData)
  } catch (error) {
    console.error('❌ [Stock API] Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar estoque' }, { status: 500 })
  }
}
