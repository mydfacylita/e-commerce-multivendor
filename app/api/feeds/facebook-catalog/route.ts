import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Facebook Commerce Catalog - Feed de Produtos
 * URL: /api/feeds/facebook-catalog
 * 
 * Formato: TSV (Tab Separated Values) para Facebook/Instagram Shop
 * Documentação: https://www.facebook.com/business/help/120325381656392
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Função para escapar valores TSV
function escapeValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Escapar tabs, newlines e aspas
  return str
    .replace(/\t/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim()
}

// Função para limpar HTML
function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

// Mapear categoria para Google Product Category (usado pelo Facebook)
function getGoogleCategory(categoryName: string): string {
  const categoryMap: { [key: string]: string } = {
    'eletronicos': '222 > Electronics',
    'celulares': '267 > Electronics > Communications > Telephony > Mobile Phones',
    'informatica': '222 > Electronics > Computers',
    'moda': '166 > Apparel & Accessories',
    'roupas': '1604 > Apparel & Accessories > Clothing',
    'calcados': '187 > Apparel & Accessories > Shoes',
    'casa': '536 > Home & Garden',
    'cozinha': '668 > Home & Garden > Kitchen & Dining',
    'eletrodomesticos': '604 > Home & Garden > Household Appliances',
    'beleza': '469 > Health & Beauty',
    'esporte': '990 > Sporting Goods',
    'brinquedos': '1253 > Toys & Games',
    'automotivo': '888 > Vehicles & Parts > Vehicle Parts & Accessories',
    'bebes': '537 > Baby & Toddler',
    'pet': '2 > Animals & Pet Supplies',
    'ferramentas': '632 > Hardware',
    'moveis': '436 > Furniture',
    'joias': '188 > Apparel & Accessories > Jewelry',
    'relogios': '201 > Apparel & Accessories > Jewelry > Watches',
  }

  const lowerName = categoryName.toLowerCase()
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerName.includes(key)) {
      return value
    }
  }
  return '5181 > All Products'
}

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
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        comparePrice: true,
        stock: true,
        images: true,
        slug: true,
        supplierSku: true,
        gtin: true,
        brand: true,
        attributes: true,
        color: true,
        model: true,
        weight: true,
        category: { select: { name: true } },
        seller: { select: { storeName: true } }
      },
      take: 10000 // Limite do Facebook
    })

    // Cabeçalhos do feed Facebook (TSV)
    const headers = [
      'id', 'title', 'description', 'availability', 'condition', 'price', 'link',
      'image_link', 'brand', 'google_product_category', 'sale_price', 'gtin', 'mpn',
      'product_type', 'additional_image_link', 'inventory', 'fb_product_category',
      'color', 'size', 'material', 'pattern', 'gender', 'age_group',
      'custom_label_0', 'custom_label_1', 'custom_label_2', 'custom_label_3', 'custom_label_4'
    ]

    // Linhas do feed
    const rows: string[] = [headers.join('\t')]

    for (const product of products) {
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
        if (product.images) {
          imageUrl = product.images.startsWith('http') ? product.images : `${baseUrl}${product.images}`
        }
      }

      // Pular produtos sem imagem
      if (!imageUrl) continue

      // Disponibilidade
      const availability = product.stock > 0 ? 'in stock' : 'out of stock'
      
      // Preço formatado
      const price = `${product.price.toFixed(2)} BRL`
      
      // Preço promocional (comparePrice é o preço "de" e price é o preço "por")
      // Se comparePrice > price, então tem promoção
      const hasPromotion = product.comparePrice && product.comparePrice > product.price
      const salePrice = hasPromotion
        ? `${product.price.toFixed(2)} BRL`
        : ''
      
      // Preço original (se tiver promoção, mostra o comparePrice como preço original)
      const displayPrice = hasPromotion
        ? `${product.comparePrice!.toFixed(2)} BRL`
        : price

      // Descrição limpa
      const description = cleanHtml(product.description || product.name).substring(0, 5000)
      
      // Título
      const title = escapeValue(product.name).substring(0, 150)
      
      // Marca
      const brand = escapeValue(product.brand) || 'MYDSHOP'
      
      // Categoria
      const googleCategory = getGoogleCategory(product.category?.name || '')
      const productType = escapeValue(product.category?.name || 'Geral')
      
      // GTIN/EAN
      const gtin = escapeValue(product.gtin) || ''
      
      // SKU como MPN
      const mpn = escapeValue(product.supplierSku) || product.id

      // Extrair TODOS os atributos do produto [{nome, valor}] → campos Meta
      const attrFields = {
        color: escapeValue((product as any).color) || '',
        size: '',
        material: '',
        pattern: '',
        gender: '',
        age_group: '',
        custom_label_0: '',
        custom_label_1: '',
        custom_label_2: '',
        custom_label_3: '',
        custom_label_4: '',
      }
      // custom_labels extras para atributos não mapeados nos campos padrão
      const extraLabels: string[] = []
      try {
        const attrs = JSON.parse((product as any).attributes || '[]')
        if (Array.isArray(attrs)) {
          for (const a of attrs) {
            const n = String(a.nome || '').toLowerCase().trim()
            const v = escapeValue(String(a.valor || '').trim())
            if (!v || v === 'other' || v === 'outros') continue
            // Campos padrão Meta
            if (!attrFields.color && (n.includes('cor') || n === 'color')) { attrFields.color = v; continue }
            if (!attrFields.size && (n.includes('tamanho') || n.includes('capacidade') || n.includes('reservat') || n.includes('size'))) { attrFields.size = v; continue }
            if (!attrFields.material && n.includes('material')) { attrFields.material = v; continue }
            if (!attrFields.pattern && (n.includes('padrão') || n.includes('padrao') || n.includes('pattern'))) { attrFields.pattern = v; continue }
            if (!attrFields.gender && (n.includes('gênero') || n.includes('genero') || n.includes('gender'))) { attrFields.gender = v; continue }
            if (!attrFields.age_group && (n.includes('faixa') || n.includes('etária') || n.includes('age'))) { attrFields.age_group = v; continue }
            // custom_label_0 = voltagem/potência
            if (!attrFields.custom_label_0 && (n.includes('voltagem') || n.includes('volt') || n.includes('potência') || n.includes('watt'))) { attrFields.custom_label_0 = v; continue }
            // custom_label_1 = linha/série/modelo
            if (!attrFields.custom_label_1 && (n.includes('linha') || n.includes('série') || n.includes('serie') || n.includes('modelo') || n.includes('model'))) { attrFields.custom_label_1 = v; continue }
            // Demais atributos → custom_label_2/3/4
            extraLabels.push(v)
          }
        }
      } catch { /* sem atributos */ }
      if (!attrFields.custom_label_2 && extraLabels[0]) attrFields.custom_label_2 = extraLabels[0]
      if (!attrFields.custom_label_3 && extraLabels[1]) attrFields.custom_label_3 = extraLabels[1]
      if (!attrFields.custom_label_4 && extraLabels[2]) attrFields.custom_label_4 = extraLabels[2]

      // Montar linha
      const row = [
        escapeValue(product.id), title, escapeValue(description), availability, 'new',
        salePrice ? displayPrice : price,
        `${baseUrl}/produtos/${product.slug}`,
        imageUrl, brand, googleCategory, salePrice, gtin, mpn, productType,
        additionalImages.join(','), String(product.stock), googleCategory,
        attrFields.color, attrFields.size, attrFields.material, attrFields.pattern,
        attrFields.gender, attrFields.age_group,
        attrFields.custom_label_0, attrFields.custom_label_1, attrFields.custom_label_2,
        attrFields.custom_label_3, attrFields.custom_label_4
      ]

      rows.push(row.join('\t'))
    }

    // Retornar como TSV
    const tsv = rows.join('\n')

    return new NextResponse(tsv, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': 'attachment; filename="facebook-catalog.tsv"',
        'Cache-Control': 'public, max-age=3600' // Cache de 1 hora
      }
    })

  } catch (error) {
    console.error('Erro ao gerar feed Facebook:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar feed de produtos' },
      { status: 500 }
    )
  }
}

// Também suporta formato XML (RSS) para compatibilidade
export async function POST(request: NextRequest) {
  const { format } = await request.json().catch(() => ({ format: 'tsv' }))
  
  if (format === 'xml') {
    // Redirecionar para o feed Google Shopping que já é XML
    return NextResponse.redirect(new URL('/api/feeds/google-shopping', request.url))
  }
  
  return GET(request)
}
