import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Google Merchant Center - Feed de Produtos (formato TXT/TSV)
 * URL: /api/feeds/google-shopping.txt
 * 
 * Formato: Tab-separated values (mais simples)
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'
    
    // Buscar produtos ativos
    const products = await prisma.product.findMany({
      where: {
        active: true,
        stock: { gt: 0 },
        price: { gt: 0 }
      },
      include: {
        category: true
      },
      take: 5000
    })

    // Cabeçalho
    const header = [
      'id',
      'title',
      'description',
      'link',
      'image_link',
      'availability',
      'price',
      'sale_price',
      'brand',
      'gtin',
      'condition',
      'google_product_category',
      'product_type',
      'identifier_exists'
    ].join('\t')

    // Linhas de produtos
    const lines = products.map(product => {
      // Parse images
      let imageUrl = ''
      try {
        const images = JSON.parse(product.images || '[]')
        if (Array.isArray(images) && images.length > 0) {
          imageUrl = images[0].startsWith('http') ? images[0] : `${baseUrl}${images[0]}`
        }
      } catch {
        imageUrl = product.images || ''
      }

      const availability = product.stock > 0 ? 'in_stock' : 'out_of_stock'
      const price = `${product.price.toFixed(2)} BRL`
      const salePrice = product.comparePrice && product.comparePrice > product.price 
        ? `${product.price.toFixed(2)} BRL` 
        : ''
      const gtin = product.gtin || ''
      const brand = product.brand || 'MYDSHOP'
      
      const description = (product.description || product.name)
        .replace(/<[^>]*>/g, '')
        .replace(/\t/g, ' ')
        .replace(/\n/g, ' ')
        .substring(0, 5000)

      const title = product.name
        .replace(/\t/g, ' ')
        .substring(0, 150)

      return [
        product.id,
        title,
        description,
        `${baseUrl}/produto/${product.slug}`,
        imageUrl,
        availability,
        price,
        salePrice,
        brand,
        gtin,
        'new',
        product.category?.name || 'Geral',
        product.category?.name || 'Geral',
        gtin ? 'yes' : 'no'
      ].join('\t')
    })

    const content = [header, ...lines].join('\n')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error: any) {
    console.error('Erro ao gerar feed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
