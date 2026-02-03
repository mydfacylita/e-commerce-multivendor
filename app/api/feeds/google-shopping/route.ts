import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Google Merchant Center - Feed de Produtos
 * URL: /api/feeds/google-shopping
 * 
 * Formato: RSS 2.0 com namespace Google Shopping
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
      take: 5000 // Limite do Google
    })

    // Gerar XML do feed
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>MYDSHOP - Produtos</title>
    <link>${baseUrl}</link>
    <description>Marketplace com os melhores preços do Brasil</description>
${products.map(product => {
  // Parse images
  let imageUrl = ''
  let additionalImages: string[] = []
  try {
    const images = JSON.parse(product.images || '[]')
    if (Array.isArray(images) && images.length > 0) {
      imageUrl = images[0].startsWith('http') ? images[0] : `${baseUrl}${images[0]}`
      additionalImages = images.slice(1, 10).map((img: string) => 
        img.startsWith('http') ? img : `${baseUrl}${img}`
      )
    }
  } catch {
    imageUrl = product.images || ''
  }

  // Disponibilidade
  const availability = product.stock > 0 ? 'in_stock' : 'out_of_stock'
  
  // Condição
  const condition = product.supplier ? 'new' : 'new'
  
  // Preço
  const price = `${product.price.toFixed(2)} BRL`
  const salePrice = product.comparePrice && product.comparePrice > product.price 
    ? `${product.price.toFixed(2)} BRL` 
    : null
  const originalPrice = product.comparePrice && product.comparePrice > product.price
    ? `${product.comparePrice.toFixed(2)} BRL`
    : null

  // Categoria Google (simplificada)
  const googleCategory = getGoogleCategory(product.category?.name || '')
  
  // GTIN/EAN
  const gtin = product.ean || product.gtin || ''
  
  // Marca
  const brand = product.brand || 'MYDSHOP'
  
  // Descrição limpa (sem HTML)
  const description = (product.description || product.name)
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .substring(0, 5000)

  // Nome limpo
  const title = product.name
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .substring(0, 150)

  return `    <item>
      <g:id>${product.id}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${baseUrl}/produto/${product.slug}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
${additionalImages.map(img => `      <g:additional_image_link>${img}</g:additional_image_link>`).join('\n')}
      <g:availability>${availability}</g:availability>
      <g:price>${originalPrice || price}</g:price>
${salePrice ? `      <g:sale_price>${salePrice}</g:sale_price>` : ''}
      <g:brand><![CDATA[${brand}]]></g:brand>
${gtin ? `      <g:gtin>${gtin}</g:gtin>` : `      <g:identifier_exists>false</g:identifier_exists>`}
      <g:condition>${condition}</g:condition>
      <g:google_product_category>${googleCategory}</g:google_product_category>
      <g:product_type><![CDATA[${product.category?.name || 'Geral'}]]></g:product_type>
      <g:shipping>
        <g:country>BR</g:country>
        <g:service>Entrega Padrão</g:service>
        <g:price>0 BRL</g:price>
      </g:shipping>
    </item>`
}).join('\n')}
  </channel>
</rss>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // Cache 1 hora
      }
    })
  } catch (error: any) {
    console.error('Erro ao gerar feed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Mapear categoria para Google Product Category
function getGoogleCategory(categoryName: string): string {
  const categoryMap: Record<string, string> = {
    'Eletrônicos': '222', // Electronics
    'Eletronicos': '222',
    'Celulares': '267', // Mobile Phones
    'Computadores': '298', // Computers
    'Moda': '166', // Apparel & Accessories
    'Vestuário': '166',
    'Roupas': '166',
    'Calçados': '187', // Shoes
    'Casa e Decoração': '536', // Home & Garden
    'Casa': '536',
    'Cozinha': '668', // Kitchen & Dining
    'Esportes': '988', // Sporting Goods
    'Saúde': '469', // Health & Beauty
    'Beleza': '469',
    'Livros': '784', // Media > Books
    'Brinquedos': '1253', // Toys & Games
    'Bebê': '537', // Baby & Toddler
    'Pet': '1', // Animals & Pet Supplies
    'Automotivo': '888', // Vehicles & Parts
    'Ferramentas': '1167', // Hardware
    'Importados': '5181' // General
  }
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  
  return '5181' // General Merchandise
}
