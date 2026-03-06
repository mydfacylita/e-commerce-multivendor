import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Feed para Buscapé, Zoom, Bondfaro e comparadores de preço BR
 * URL: /api/feeds/buscape
 * Formato: CSV (padrão aceito pelo Buscapé e similares)
 * Docs: https://www.buscape.com.br/parceiros
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/"/g, '""')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim()
}

function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'

    const products = await prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, price: { gt: 0 } },
      include: { category: true },
      take: 5000
    })

    // Header CSV — colunas aceitas pelo Buscapé
    const header = [
      'id',
      'title',
      'description',
      'link',
      'image_link',
      'price',
      'sale_price',
      'brand',
      'condition',
      'availability',
      'category',
      'gtin',
      'mpn',
      'shipping_label',
      'color',
      'model',
      'custom_label_0',
    ].join(',')

    const rows = products.map(product => {
      let imageUrl = ''
      try {
        const images = JSON.parse(product.images || '[]')
        if (Array.isArray(images) && images.length > 0) {
          imageUrl = images[0].startsWith('http') ? images[0] : `${baseUrl}${images[0]}`
        }
      } catch { /* sem imagem */ }

      const description = cleanHtml(product.description || product.name).substring(0, 1000)
      const price = `${product.price.toFixed(2)} BRL`
      const salePrice = product.comparePrice && product.comparePrice > product.price
        ? `${product.price.toFixed(2)} BRL`
        : ''

      // Extrair atributos do produto
      let colorAttr = (product as any).color || ''
      let modelAttr = (product as any).model || ''
      let customLabel = ''
      try {
        const attrs = JSON.parse((product as any).attributes || '[]')
        if (Array.isArray(attrs)) {
          for (const a of attrs) {
            const n = String(a.nome || '').toLowerCase()
            const v = String(a.valor || '')
            if (!colorAttr && (n.includes('cor') || n.includes('color'))) colorAttr = v
            if (!modelAttr && (n.includes('modelo') || n.includes('refer') || n.includes('model'))) modelAttr = v
            if (!customLabel && (n.includes('capacidade') || n.includes('voltagem') || n.includes('potência'))) customLabel = v
          }
        }
      } catch { /* sem atributos */ }

      const cols = [
        esc(product.id),
        esc(product.name),
        esc(description),
        esc(`${baseUrl}/produtos/${product.slug}`),
        esc(imageUrl),
        esc(price),
        esc(salePrice),
        esc((product as any).brand || ''),
        'new',
        product.stock > 0 ? 'in stock' : 'out of stock',
        esc(product.category?.name || ''),
        esc((product as any).gtin || ''),
        esc(product.id),
        'free',
        esc(colorAttr),
        esc(modelAttr),
        esc(customLabel),
      ]

      return cols.map(c => `"${c}"`).join(',')
    })

    const csv = [header, ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="mydshop-feed-buscape.csv"',
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('[Feed Buscapé] Erro:', error)
    return NextResponse.json({ error: 'Erro ao gerar feed' }, { status: 500 })
  }
}
