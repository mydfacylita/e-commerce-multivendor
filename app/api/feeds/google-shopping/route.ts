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
  const condition = 'new'
  
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
  const gtin = product.gtin || ''
  
  // Marca
  const brand = product.brand || 'MYDSHOP'
  
  // Grupo de idade (obrigatório para vestuário)
  const ageGroup = getAgeGroup(product.category?.name || '', product.name)
  
  // Cor (obrigatório para vestuário) - extrair de múltiplas fontes
  const color = extractColor(product)
  
  // Tamanho (se aplicável) - extrair de múltiplas fontes
  const size = extractSize(product)
  
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
      <g:age_group>${ageGroup}</g:age_group>
      <g:color><![CDATA[${color}]]></g:color>
${size ? `      <g:size><![CDATA[${size}]]></g:size>` : ''}
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

// Determinar faixa etária do produto
function getAgeGroup(categoryName: string, productName: string): string {
  const categoryLower = categoryName.toLowerCase()
  const nameLower = productName.toLowerCase()
  const combined = categoryLower + ' ' + nameLower
  
  // Bebês (0-2 anos)
  if (combined.match(/beb[êe]|recém-nascido|recem-nascido|newborn|infant/i)) {
    return 'infant'
  }
  
  // Crianças (2-12 anos)
  if (combined.match(/infantil|criança|crian[çc]a|kids|brinquedo|toy|child/i)) {
    return 'kids'
  }
  
  // Padrão: Adulto
  return 'adult'
}

// Extrair cor do produto de múltiplas fontes
function extractColor(product: any): string {
  // 1. Campo color direto
  if (product.color && product.color.trim()) {
    return product.color.trim()
  }
  
  // 2. Tentar extrair do variants JSON
  if (product.variants) {
    try {
      const variants = JSON.parse(product.variants)
      if (Array.isArray(variants) && variants.length > 0) {
        // Procurar cor nas variantes
        for (const variant of variants) {
          if (variant.color || variant.cor) {
            return variant.color || variant.cor
          }
          if (variant.attributes) {
            const colorAttr = variant.attributes.find((a: any) => 
              a.name?.toLowerCase().includes('cor') || 
              a.name?.toLowerCase().includes('color') ||
              a.nome?.toLowerCase().includes('cor')
            )
            if (colorAttr) return colorAttr.value || colorAttr.valor
          }
        }
      }
    } catch (e) {
      // Ignorar erro de parse
    }
  }
  
  // 3. Tentar extrair do attributes JSON
  if (product.attributes) {
    try {
      const attributes = JSON.parse(product.attributes)
      if (Array.isArray(attributes)) {
        const colorAttr = attributes.find((a: any) => 
          a.name?.toLowerCase().includes('cor') || 
          a.name?.toLowerCase().includes('color') ||
          a.nome?.toLowerCase().includes('cor')
        )
        if (colorAttr) {
          return colorAttr.value || colorAttr.valor
        }
      }
    } catch (e) {
      // Ignorar erro de parse
    }
  }
  
  // 4. Tentar extrair do nome do produto
  const colorRegex = /(preto|branco|vermelho|azul|verde|amarelo|rosa|roxo|laranja|cinza|marrom|bege|dourado|prateado|black|white|red|blue|green|yellow|pink|purple|orange|gray|brown|beige|gold|silver)/i
  const match = product.name?.match(colorRegex)
  if (match) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
  }
  
  // Padrão
  return 'Variado'
}

// Extrair tamanho do produto de múltiplas fontes
function extractSize(product: any): string | null {
  // 1. Tentar extrair do sizes JSON
  if (product.sizes) {
    try {
      const sizes = JSON.parse(product.sizes)
      if (Array.isArray(sizes) && sizes.length > 0) {
        // Se tem múltiplos tamanhos, retornar o primeiro ou "Variado"
        if (sizes.length === 1) {
          return sizes[0].size || sizes[0].name || sizes[0]
        } else {
          return sizes.map((s: any) => s.size || s.name || s).join('/')
        }
      }
    } catch (e) {
      // Ignorar erro de parse
    }
  }
  
  // 2. Tentar extrair do variants JSON
  if (product.variants) {
    try {
      const variants = JSON.parse(product.variants)
      if (Array.isArray(variants) && variants.length > 0) {
        const sizes: string[] = []
        for (const variant of variants) {
          if (variant.size || variant.tamanho) {
            sizes.push(variant.size || variant.tamanho)
          }
          if (variant.attributes) {
            const sizeAttr = variant.attributes.find((a: any) => 
              a.name?.toLowerCase().includes('tamanho') || 
              a.name?.toLowerCase().includes('size') ||
              a.nome?.toLowerCase().includes('tamanho')
            )
            if (sizeAttr) sizes.push(sizeAttr.value || sizeAttr.valor)
          }
        }
        if (sizes.length > 0) {
          return sizes.length === 1 ? sizes[0] : sizes.join('/')
        }
      }
    } catch (e) {
      // Ignorar erro de parse
    }
  }
  
  // 3. Tentar extrair do attributes JSON
  if (product.attributes) {
    try {
      const attributes = JSON.parse(product.attributes)
      if (Array.isArray(attributes)) {
        const sizeAttr = attributes.find((a: any) => 
          a.name?.toLowerCase().includes('tamanho') || 
          a.name?.toLowerCase().includes('size') ||
          a.nome?.toLowerCase().includes('tamanho')
        )
        if (sizeAttr) {
          return sizeAttr.value || sizeAttr.valor
        }
      }
    } catch (e) {
      // Ignorar erro de parse
    }
  }
  
  // Não retornar nada se não encontrar (size é opcional)
  return null
}
