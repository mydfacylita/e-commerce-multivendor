import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Google Product Ratings Feed
 * Formato exigido pelo programa "Avaliações de Produto" do Google Merchant Center
 * Spec: https://support.google.com/merchants/answer/7558033
 *
 * URL para registrar no Merchant Center: /api/feeds/google-reviews
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'

    // Buscar todas as avaliações aprovadas com dados do produto e do usuário
    const reviews = await prisma.productReview.findMany({
      where: { isApproved: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            gtin: true,
            brand: true,
            mpn: true,
          }
        },
        user: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50000,
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:vc="http://www.w3.org/2007/XMLSchema-versioning"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="http://www.google.com/shopping/reviews/schema/product/2.3/product_reviews.xsd">
  <version>2.3</version>
  <aggregator>
    <name>MYDSHOP</name>
  </aggregator>
  <publisher>
    <name>MYDSHOP</name>
    <favicon>${baseUrl}/favicon.ico</favicon>
  </publisher>
  <reviews>
${reviews.map(review => {
  const productUrl = `${baseUrl}/produtos/${review.product.slug}`
  const reviewerName = review.user?.name
    ? esc((() => {
        const parts = review.user!.name!.trim().split(/\s+/)
        if (parts.length <= 1) return parts[0]
        return parts[0] + ' ' + parts.slice(1).map(p => p[0].toUpperCase() + '.').join(' ')
      })())
    : 'Cliente Verificado'

  // Monta o conteúdo combinando title + comment + pros/cons
  const parts: string[] = []
  if (review.title) parts.push(review.title)
  if (review.comment) parts.push(review.comment)
  if (review.pros) parts.push(`Pontos positivos: ${review.pros}`)
  if (review.cons) parts.push(`Pontos negativos: ${review.cons}`)
  const content = esc(parts.join(' | ') || 'Avaliação do produto.')

  return `    <review>
      <review_id>${esc(review.id)}</review_id>
      <reviewer>
        <name>${reviewerName}</name>
        <is_anonymous>false</is_anonymous>
      </reviewer>
      <review_timestamp>${review.createdAt.toISOString()}</review_timestamp>
      <content>${content}</content>
      <review_url type="singleton">${productUrl}</review_url>
      <ratings>
        <overall min="1" max="5">${review.rating}</overall>
      </ratings>${review.isVerified ? '\n      <is_verified_purchase>true</is_verified_purchase>' : ''}
      <products>
        <product>
          <product_ids>
${review.product.gtin ? `            <gtins>\n              <gtin>${esc(review.product.gtin)}</gtin>\n            </gtins>` : ''}
${review.product.mpn ? `            <mpns>\n              <mpn>${esc(review.product.mpn)}</mpn>\n            </mpns>` : ''}
            <brands>
              <brand>${esc(review.product.brand || 'MYDSHOP')}</brand>
            </brands>
          </product_ids>
          <product_name>${esc(review.product.name)}</product_name>
          <product_url>${productUrl}</product_url>
        </product>
      </products>
    </review>`
}).join('\n')}
  </reviews>
</feed>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error: any) {
    console.error('Erro ao gerar feed de avaliações Google:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
