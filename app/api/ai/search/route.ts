/**
 * GET /api/ai/search?q=<linguagem natural>
 * Interpreta buscas em linguagem natural com Gemini e retorna
 * produtos relevantes do catálogo.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callGemini, getAIConfig } from '@/lib/ai-gemini'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [], suggestion: null })
    }

    // 1. Usar Gemini para interpretar a busca (se disponível)
    const aiConfig = await getAIConfig()
    let keywords: string[] = []
    let maxPrice: number | null = null
    let minPrice: number | null = null
    let categoryHint: string | null = null
    let suggestion: string | null = null

    if (aiConfig) {
      try {
        const prompt = `
Interprete esta busca em linguagem natural para uma loja online brasileira.
Busca: "${query.replace(/"/g, "'")}

Retorne APENAS JSON válido (sem markdown):
{
  "keywords": ["palavra1", "palavra2", "palavra3"],
  "maxPrice": null ou número,
  "minPrice": null ou número,
  "category": null ou "nome da categoria",
  "suggestion": null ou "sugestão de busca mais efetiva para o usuário (ex: 'Mostrando resultados para: Notebook Samsung até R$2.000')"
}
`
        const raw = await callGemini(prompt)
        const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(clean)
        keywords = parsed.keywords || query.split(/\s+/).slice(0, 4)
        maxPrice = parsed.maxPrice || null
        minPrice = parsed.minPrice || null
        categoryHint = parsed.category || null
        suggestion = parsed.suggestion || null
      } catch {
        keywords = query.split(/\s+/).slice(0, 4)
      }
    } else {
      keywords = query.split(/\s+/).slice(0, 4)
    }

    // 2. Construir query no banco
    const whereClause: any = {
      active: true,
      approvalStatus: 'APPROVED',
      AND: keywords.map((kw: string) => ({
        OR: [
          { name: { contains: kw } },
          { description: { contains: kw } },
          { brand: { contains: kw } }
        ]
      }))
    }

    if (maxPrice) whereClause.price = { ...whereClause.price, lte: maxPrice }
    if (minPrice) whereClause.price = { ...whereClause.price, gte: minPrice }

    if (categoryHint) {
      const cat = await prisma.category.findFirst({
        where: { name: { contains: categoryHint } }
      })
      if (cat) whereClause.categoryId = cat.id
    }

    const products = await prisma.product.findMany({
      where: whereClause,
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
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }]
    })

    // 3. Se ainda assim não encontrou, fazer busca ampla somente na primeira keyword
    let finalProducts = products
    if (products.length === 0 && keywords.length > 1) {
      const broadProducts = await prisma.product.findMany({
        where: {
          active: true,
          approvalStatus: 'APPROVED',
          OR: [
            { name: { contains: keywords[0] } },
            { description: { contains: keywords[0] } }
          ]
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
        take: 20
      })
      finalProducts = broadProducts
    }

    const formatted = finalProducts.map(p => {
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
        image,
        category: p.category?.name,
        brand: p.brand
      }
    })

    return NextResponse.json({
      products: formatted,
      suggestion,
      total: formatted.length,
      query
    })
  } catch (error) {
    console.error('[AI Search]', error)
    return NextResponse.json({ error: 'Erro na busca' }, { status: 500 })
  }
}
