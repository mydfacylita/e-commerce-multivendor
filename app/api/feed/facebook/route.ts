import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Feed de produtos para Facebook/Instagram Shopping
// O Meta acessa esta URL periodicamente para sincronizar o catálogo
// Formato: CSV compatível com Facebook Product Catalog
// Docs: https://www.facebook.com/business/help/120325381656392

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'

    const products = await prisma.product.findMany({
      where: {
        active: true,
        approvalStatus: 'APPROVED',
      },
      include: {
        category: {
          include: { parent: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10000
    })

    // Cabeçalho CSV conforme especificação do Facebook
    const headers = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'additional_image_link',
      'brand',
      'google_product_category',
      'fb_product_category',
      'quantity_to_sell_on_facebook',
      'sale_price',
    ]

    const rows: string[] = [headers.join('\t')]

    for (const product of products) {
      // Imagens
      let mainImage = ''
      let additionalImages = ''
      try {
        const rawImages = product.images || ''
        // Suporta JSON array, string separada por vírgula, ou URL única
        let imgs: string[] = []
        if (rawImages.startsWith('[')) {
          imgs = JSON.parse(rawImages)
        } else {
          imgs = rawImages.split(',').map(s => s.trim()).filter(Boolean)
        }
        mainImage = imgs[0] || ''
        additionalImages = imgs.slice(1, 5).join(',') // Até 4 imagens adicionais
      } catch { /* usa vazio */ }

      // Descrição — remover HTML
      const description = (product.description || product.name)
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000)

      // Categoria para Facebook/Google
      let category = 'Geral'
      if (product.category?.parent) {
        category = `${product.category.parent.name} > ${product.category.name}`
      } else if (product.category) {
        category = product.category.name
      }

      // Estoque
      const stock = product.stock ?? 0
      const availability = stock > 0 ? 'in stock' : 'out of stock'

      // Preço
      const price = `${product.price.toFixed(2)} BRL`
      const salePrice = product.comparePrice && product.comparePrice > product.price
        ? `${product.price.toFixed(2)} BRL`
        : ''

      // URL do produto
      const link = `${baseUrl}/produtos/${product.slug}`

      // Marca
      const brand = (product as any).brand || 'MYDSHOP'

      // Escapar aspas duplas nos campos de texto
      const escape = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`

      const row = [
        escape(product.id),
        escape(product.name.substring(0, 150)),
        escape(description),
        availability,
        'new',
        price,
        escape(link),
        escape(mainImage),
        escape(additionalImages),
        escape(brand),
        '',            // google_product_category (opcional)
        escape(category),
        String(Math.min(stock, 500)),
        salePrice,
      ]

      rows.push(row.join('\t'))
    }

    const csv = rows.join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache de 1 hora
        'Content-Disposition': 'inline; filename="facebook-feed.tsv"'
      }
    })

  } catch (error) {
    console.error('[Facebook Feed] Erro:', error)
    return NextResponse.json({ error: 'Erro ao gerar feed' }, { status: 500 })
  }
}
