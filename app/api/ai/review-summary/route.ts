/**
 * GET /api/ai/review-summary?productId=xxx
 * Usa Gemini para resumir as avaliações de um produto,
 * destacando prós, contras e sentimento geral.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callGemini, getAIConfig } from '@/lib/ai-gemini'

export const dynamic = 'force-dynamic'

// Cache simples em memória (TTL 30 minutos)
const cache = new Map<string, { data: any; ts: number }>()
const TTL = 30 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 })
    }

    // Cache hit
    const cached = cache.get(productId)
    if (cached && Date.now() - cached.ts < TTL) {
      return NextResponse.json(cached.data)
    }

    // Verificar se IA está configurada
    const aiConfig = await getAIConfig()
    if (!aiConfig) {
      return NextResponse.json({ error: 'IA não configurada' }, { status: 503 })
    }

    // Buscar reviews aprovadas
    const reviews = await prisma.productReview.findMany({
      where: { productId, isApproved: true },
      select: { rating: true, title: true, comment: true, pros: true, cons: true },
      take: 50, // Limitar para não estourar o contexto
      orderBy: { createdAt: 'desc' }
    })

    if (reviews.length < 3) {
      return NextResponse.json({
        summary: null,
        reason: 'Avaliações insuficientes (mínimo 3)',
        count: reviews.length
      })
    }

    // Estatísticas básicas
    const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>
    reviews.forEach(r => dist[r.rating] = (dist[r.rating] || 0) + 1)

    // Montar contexto para o Gemini
    const reviewTexts = reviews.slice(0, 25).map(r => {
      const parts = [`[${r.rating}★]`]
      if (r.title) parts.push(r.title)
      if (r.comment) parts.push(r.comment)
      if (r.pros) parts.push(`Prós: ${r.pros}`)
      if (r.cons) parts.push(`Contras: ${r.cons}`)
      return parts.join(' — ')
    }).join('\n')

    const prompt = `
Analise as avaliações abaixo de um produto em uma loja online brasileira e gere um resumo útil para novos compradores.
Retorne APENAS um JSON válido (sem markdown):
{
  "headline": "frase de 1 linha resumindo o sentimento geral (ex: 'Ótimo custo-benefício, mas entrega pode demorar')",
  "pros": ["ponto positivo 1", "ponto positivo 2", "ponto positivo 3"],
  "cons": ["ponto negativo 1", "ponto negativo 2"],
  "buyAdvice": "conselho prático de 1-2 linhas para quem está considerando comprar",
  "sentimentPct": 85
}

Avaliações (${reviews.length} ao total, média ${avgRating.toFixed(1)} estrelas):
${reviewTexts}
`

    const raw = await callGemini(prompt)
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const aiSummary = JSON.parse(clean)

    const result = {
      summary: aiSummary,
      stats: {
        count: reviews.length,
        average: avgRating,
        distribution: dist
      }
    }

    // Salvar no cache
    cache.set(productId, { data: result, ts: Date.now() })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[AI Review Summary]', error)
    return NextResponse.json({ error: 'Erro ao gerar resumo' }, { status: 500 })
  }
}
