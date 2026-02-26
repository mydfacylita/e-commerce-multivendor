'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Buscar templates de catálogo disponíveis para uma categoria/domínio ML
// Lógica correta: busca por domínio/categoria + query (nome do produto), NÃO apenas por GTIN
// GTIN é apenas refinamento para pré-selecionar o template correto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { gtin, title, categoryId, domainId, query } = body

    // query pode ser enviado pelo frontend (caixa de busca manual)
    const searchQuery = query || title || ''

    // Buscar configuração do ML - usar mercadoLivreAuth
    const integration = await prisma.mercadoLivreAuth.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!integration?.accessToken) {
      return NextResponse.json(
        { error: 'Mercado Livre não conectado' },
        { status: 400 }
      )
    }

    const headers = { Authorization: `Bearer ${integration.accessToken}` }

    // Helper: mapeia objeto de produto da resposta ML para o nosso formato
    const mapProduct = (p: any, gtinMatch = false) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      domainId: p.domain_id,
      picture: p.pictures?.[0]?.url,
      attributes: p.attributes?.slice(0, 10).map((a: any) => ({
        id: a.id, name: a.name, value: a.value_name || a.value_struct?.number
      })),
      ...(gtinMatch ? { gtinMatch: true } : {})
    })

    const allResults: any[] = []

    // ─── ESTRATÉGIA 1: domain_id + query ───
    // A API retorna objetos completos em results[], não IDs
    if (domainId && searchQuery) {
      try {
        const url = `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&domain_id=${encodeURIComponent(domainId)}&q=${encodeURIComponent(searchQuery)}&limit=20`
        console.log('[Catalog] domain+query:', url)
        const r = await fetch(url, { headers })
        if (r.ok) {
          const data = await r.json()
          const products: any[] = data.results || []
          if (products.length > 0) {
            console.log('[Catalog] ✅ domain+query =>', products.length)
            allResults.push(...products.map((p: any) => mapProduct(p)))
          }
        }
      } catch { /* continue */ }
    }

    // ─── ESTRATÉGIA 2: domain_id sem query ───
    if (domainId && allResults.length === 0) {
      try {
        const url = `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&domain_id=${encodeURIComponent(domainId)}&limit=20`
        console.log('[Catalog] domain-only:', url)
        const r = await fetch(url, { headers })
        if (r.ok) {
          const data = await r.json()
          const products: any[] = data.results || []
          if (products.length > 0) {
            console.log('[Catalog] ✅ domain-only =>', products.length)
            allResults.push(...products.map((p: any) => mapProduct(p)))
          }
        }
      } catch { /* continue */ }
    }

    // ─── ESTRATÉGIA 3: categoryId + query ───
    if (categoryId && allResults.length === 0 && searchQuery) {
      try {
        const url = `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&category=${categoryId}&q=${encodeURIComponent(searchQuery)}&limit=20`
        console.log('[Catalog] category+query:', url)
        const r = await fetch(url, { headers })
        if (r.ok) {
          const data = await r.json()
          const products: any[] = data.results || []
          if (products.length > 0) {
            console.log('[Catalog] ✅ category+query =>', products.length)
            allResults.push(...products.map((p: any) => mapProduct(p)))
          }
        }
      } catch { /* continue */ }
    }

    // ─── ESTRATÉGIA 4: query pura (último recurso) ───
    if (allResults.length === 0 && searchQuery) {
      try {
        const url = `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&q=${encodeURIComponent(searchQuery)}&limit=20`
        console.log('[Catalog] query-only:', url)
        const r = await fetch(url, { headers })
        if (r.ok) {
          const data = await r.json()
          const products: any[] = data.results || []
          if (products.length > 0) {
            console.log('[Catalog] ✅ query-only =>', products.length)
            allResults.push(...products.map((p: any) => mapProduct(p)))
          }
        }
      } catch { /* continue */ }
    }

    // ─── Refinamento: GTIN via product_identifier → move match para o topo ───
    let gtinMatchId: string | null = null
    if (gtin) {
      const cleanGtin = gtin.replace(/\D/g, '')
      try {
        const url = `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&product_identifier=${cleanGtin}`
        const r = await fetch(url, { headers })
        if (r.ok) {
          const data = await r.json()
          const products: any[] = data.results || []
          if (products.length > 0) {
            gtinMatchId = products[0].id
            const existing = allResults.findIndex((p: any) => p.id === gtinMatchId)
            if (existing > 0) {
              const [match] = allResults.splice(existing, 1)
              allResults.unshift({ ...match, gtinMatch: true })
            } else if (existing === -1) {
              allResults.unshift(mapProduct(products[0], true))
            } else {
              allResults[0].gtinMatch = true
            }
          }
        }
      } catch { /* continue */ }
    }

    if (allResults.length > 0) {
      return NextResponse.json({
        found: true,
        products: allResults.slice(0, 15),
        gtinMatchId,
        total: allResults.length
      })
    }

    return NextResponse.json({
      found: false,
      products: [],
      message: 'Nenhum template encontrado no catálogo para esta categoria.',
      hint: domainId
        ? 'Tente digitar um termo diferente na caixa de busca.'
        : 'Verifique se a categoria selecionada suporta publicação via catálogo.'
    })

  } catch (error) {
    console.error('[Catalog] Erro:', error)
    return NextResponse.json({ error: 'Erro interno ao buscar catálogo' }, { status: 500 })
  }
}
