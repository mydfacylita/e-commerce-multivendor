/**
 * GET /api/ai/recommendations?productId=xxx
 * Retorna produtos recomendados com base no produto atual,
 * usando Gemini para personalizar o texto de apresentação.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callGemini, getAIConfig } from '@/lib/ai-gemini'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 })
    }

    // Buscar produto atual
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        categoryId: true,
        brand: true,
        category: { select: { name: true } }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Buscar produtos similares: mesma categoria, preço próximo (+/-50%), excluindo o próprio
    const minPrice = product.price * 0.5
    const maxPrice = product.price * 1.8

    const candidates = await prisma.product.findMany({
      where: {
        active: true,
        approvalStatus: 'APPROVED',
        categoryId: product.categoryId,
        id: { not: productId },
        price: { gte: minPrice, lte: maxPrice }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        images: true,
        brand: true,
        category: { select: { name: true } }
      },
      take: 20,
      orderBy: { featured: 'desc' }
    })

    if (candidates.length === 0) {
      // Fallback: qualquer produto da mesma categoria
      const fallback = await prisma.product.findMany({
        where: {
          active: true,
          approvalStatus: 'APPROVED',
          categoryId: product.categoryId,
          id: { not: productId }
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          brand: true,
        },
        take: 8,
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ 
        products: formatProducts(fallback),
        title: 'Outros produtos nesta categoria',
        subtitle: null
      })
    }

    // Usar AI para selecionar os melhores 6 e gerar título contextual
    const aiConfig = await getAIConfig()
    if (!aiConfig) {
      return NextResponse.json({ 
        products: formatProducts(candidates.slice(0, 6)),
        title: 'Você também pode gostar',
        subtitle: null
      })
    }

    const names = candidates.slice(0, 15).map((c, i) => `${i}: ${c.name} (R$${c.price.toFixed(2)})`).join('\n')
    const prompt = `
Produto que o cliente está vendo: "${product.name}" (R$${product.price.toFixed(2)}, categoria: ${product.category?.name || ''})

Produtos disponíveis para recomendação:
${names}

Tarefa: Selecione os 6 índices mais relevantes para recomendar (complementares ou similares ao produto atual).
Retorne APENAS um JSON válido (sem markdown):
{
  "indices": [0, 1, 2, 3, 4, 5],
  "title": "título curto e atraente para a seção (ex: 'Complete seu look', 'Você também pode curtir')",
  "subtitle": "frase curta opcional de 1 linha ou null"
}
`
    let selected = candidates.slice(0, 6)
    let title = 'Você também pode gostar'
    let subtitle: string | null = null

    try {
      const json = await callGemini(prompt)
      const clean = json.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(clean)
      if (Array.isArray(parsed.indices)) {
        selected = parsed.indices.slice(0, 6).map((i: number) => candidates[i]).filter(Boolean)
      }
      if (parsed.title) title = parsed.title
      if (parsed.subtitle) subtitle = parsed.subtitle
    } catch {
      // Fallback silencioso
    }

    return NextResponse.json({
      products: formatProducts(selected),
      title,
      subtitle
    })
  } catch (error) {
    console.error('[AI Recommendations]', error)
    return NextResponse.json({ error: 'Erro ao buscar recomendações' }, { status: 500 })
  }
}

function formatProducts(products: any[]) {
  return products.map(p => {
    let image = ''
    try {
      const imgs = JSON.parse(p.images)
      image = Array.isArray(imgs) ? imgs[0] : imgs
    } catch { image = p.images || '' }
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      comparePrice: p.comparePrice,
      image
    }
  })
}
