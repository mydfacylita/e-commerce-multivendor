import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseVariantsJson, findSkuBySelections, getCheapestAvailableSku, hasVariations } from '@/lib/product-variants'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/products/[id]/variants
 * Retorna as variações disponíveis de um produto
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price: true,
        variants: true,
        stock: true,
        images: true
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Parse variants
    const variants = parseVariantsJson(product.variants)

    if (!variants || !hasVariations(variants)) {
      // Produto sem variações
      return NextResponse.json({
        hasVariations: false,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock
        }
      })
    }

    // Produto com variações
    const cheapestSku = getCheapestAvailableSku(variants)

    return NextResponse.json({
      hasVariations: true,
      product: {
        id: product.id,
        name: product.name,
        defaultPrice: product.price,
        images: product.images
      },
      variants: {
        source: variants.source,
        lastUpdated: variants.lastUpdated,
        properties: variants.properties,
        skus: variants.skus,
        metadata: variants.metadata
      },
      cheapestSku,
      totalSkus: variants.skus.length,
      availableSkus: variants.skus.filter(s => s.available).length
    })

  } catch (error: any) {
    console.error('Erro ao buscar variações:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/products/[id]/variants
 * Busca SKU específico baseado nas seleções
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { selections } = await request.json()

    if (!selections || !Array.isArray(selections)) {
      return NextResponse.json({ error: 'Seleções inválidas' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        variants: true
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const variants = parseVariantsJson(product.variants)

    if (!variants) {
      return NextResponse.json({ error: 'Produto sem variações' }, { status: 400 })
    }

    const sku = findSkuBySelections(variants, selections)

    if (!sku) {
      return NextResponse.json({
        found: false,
        message: 'Combinação não disponível'
      })
    }

    return NextResponse.json({
      found: true,
      sku: {
        skuId: sku.skuId,
        skuAttr: sku.skuAttr,
        price: sku.price,
        originalPrice: sku.originalPrice,
        stock: sku.stock,
        available: sku.available,
        image: sku.image,
        properties: sku.properties
      }
    })

  } catch (error: any) {
    console.error('Erro ao buscar SKU:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
