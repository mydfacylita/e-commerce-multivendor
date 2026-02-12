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
      'age_group',
      'color',
      'size',
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
      const ageGroup = getAgeGroup(product.category?.name || '', product.name)
      const color = extractColor(product)
      const size = extractSize(product)
      
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
        ageGroup,
        size || '',
        color,
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
      // Ignorar erro
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
      // Ignorar erro
    }
  }
  
  // 4. Extrair do nome
  const colorRegex = /(preto|branco|vermelho|azul|verde|amarelo|rosa|roxo|laranja|cinza|marrom|bege|dourado|prateado|black|white|red|blue|green|yellow|pink|purple|orange|gray|brown|beige|gold|silver)/i
  const match = product.name?.match(colorRegex)
  if (match) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
  }
  
  return 'Variado'
}

// Extrair tamanho do produto de múltiplas fontes
function extractSize(product: any): string | null {
  // 1. Tentar extrair do sizes JSON
  if (product.sizes) {
    try {
      const sizes = JSON.parse(product.sizes)
      if (Array.isArray(sizes) && sizes.length > 0) {
        if (sizes.length === 1) {
          return sizes[0].size || sizes[0].name || sizes[0]
        } else {
          return sizes.map((s: any) => s.size || s.name || s).join('/')
        }
      }
    } catch (e) {
      // Ignorar erro
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
      // Ignorar erro
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
      // Ignorar erro
    }
  }
  
  return null
} // Padrão: Adulto
  return 'adult'
}
