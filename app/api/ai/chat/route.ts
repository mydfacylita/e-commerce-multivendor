/**
 * POST /api/ai/chat
 * Assistente de compras IA — interpreta a mensagem do cliente,
 * busca produtos no catálogo e responde com recomendações.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callGemini, getAIConfig } from '@/lib/ai-gemini'

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ── Helper: salva/atualiza a sessão de chat no banco ──────────────────────────
async function saveSession(opts: {
  sessionId?: string; pageUrl?: string; pageTitle?: string; wasProactive?: boolean;
  messages: { role: string; content: string }[]; cartContext: string | null;
  wentToCheckout: boolean; request: Request
}) {
  try {
    if (!opts.sessionId) return
    const ip = opts.request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null
    const ua = opts.request.headers.get('user-agent')?.slice(0, 500) || null
    await prisma.aiChatSession.upsert({
      where: { sessionId: opts.sessionId },
      create: {
        sessionId: opts.sessionId,
        pageUrl: opts.pageUrl?.slice(0, 500),
        pageTitle: opts.pageTitle?.slice(0, 255),
        messages: JSON.stringify(opts.messages),
        messageCount: opts.messages.filter(m => m.role === 'user').length,
        wasProactive: opts.wasProactive ?? false,
        addedToCart: !!opts.cartContext,
        wentToCheckout: opts.wentToCheckout,
        ipAddress: ip,
        userAgent: ua,
      },
      update: {
        messages: JSON.stringify(opts.messages),
        messageCount: opts.messages.filter(m => m.role === 'user').length,
        addedToCart: !!opts.cartContext,
        wentToCheckout: opts.wentToCheckout,
        pageUrl: opts.pageUrl?.slice(0, 500),
      },
    })
  } catch { /* não falha a requisição */ }
}

export async function POST(request: NextRequest) {
  try {
    const aiConfig = await getAIConfig()
    if (!aiConfig) {
      return NextResponse.json({ error: 'IA não configurada' }, { status: 503 })
    }

    const body = await request.json()
    const { message, history = [], cartContext = null, cartTotal = 0, sessionId, pageUrl, pageTitle, wasProactive = false }: {
      message: string; history: ChatMessage[]; cartContext: string | null; cartTotal: number;
      sessionId?: string; pageUrl?: string; pageTitle?: string; wasProactive?: boolean
    } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    }

    // Passo 1: Usar Gemini para extrair intenção e filtros de busca
    const intentPrompt = `
Analise a mensagem do cliente em uma loja virtual brasileira e extraia a intenção de compra.
Retorne APENAS um JSON válido (sem markdown, sem código) com este formato exato:
{
  "query": "palavras-chave ESPECÍFICAS do produto para buscar no catálogo (ex: 'camiseta azul', 'fone bluetooth'). Se não houver produto específico, use string vazia.",
  "maxPrice": null ou número,
  "minPrice": null ou número,
  "category": null ou "nome da categoria",
  "intent": "search" ou "catalog" ou "help" ou "greeting"
}

Regras para "intent":
- "search" = cliente quer um produto específico (ex: "quero tênis", "tem fone sem fio?", "presente até R$100")
- "catalog" = cliente quer ver o que a loja tem no geral, sem produto específico (ex: "quais produtos tem?", "o que vocês vendem?", "me mostra os produtos", "o que tem de bom aqui?")
- "cart_view" = cliente quer ver o carrinho (ex: "ver meu carrinho", "o que tenho no carrinho?", "meu carrinho", "itens no carrinho")
- "cart_checkout" = cliente quer finalizar a compra (ex: "finalizar compra", "ir para o checkout", "pagar", "concluir pedido")
- "help" = dúvida sobre prazo, frete, troca, pagamento
- "greeting" = saudação sem intenção de compra (ex: "oi", "olá")

Mensagem do cliente: "${message.replace(/"/g, "'")}"
`
    let searchFilters = { query: message, maxPrice: null as number | null, minPrice: null as number | null, category: null as string | null, intent: 'search' as string }

    try {
      const intentJson = await callGemini(intentPrompt)
      // Remove possível markdown
      const clean = intentJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      searchFilters = JSON.parse(clean)
    } catch {
      // Fallback: usa a mensagem diretamente como query
    }

    // Passo 2: Tratar intenções de carrinho diretamente
    if (searchFilters.intent === 'cart_view') {
      if (!cartContext) {
        return NextResponse.json({
          message: 'Seu carrinho está vazio! 🛒\n\nQuer que eu te ajude a encontrar algo especial?',
          products: [], intent: 'cart_view', actions: []
        })
      }
      const msgs = [...history, { role: 'user', content: message }, { role: 'assistant', content: `Carrinho visualizado. ${cartContext}` }]
      void saveSession({ sessionId, pageUrl, pageTitle, wasProactive, messages: msgs, cartContext, wentToCheckout: false, request })
      return NextResponse.json({
        message: `Aqui está seu carrinho: __SHOW_CART__\n\nTotal: R$${cartTotal.toFixed(2).replace('.', ',')}\n\nDeseja continuar comprando ou finalizar o pedido?`,
        products: [], intent: 'cart_view', actions: ['view_cart', 'checkout']
      })
    }

    if (searchFilters.intent === 'cart_checkout') {
      if (!cartContext) {
        return NextResponse.json({
          message: 'Seu carrinho ainda está vazio! 😊\n\nAdicione produtos antes de finalizar. Precisa de ajuda para encontrar algo?',
          products: [], intent: 'cart_checkout', actions: []
        })
      }
      const msgs = [...history, { role: 'user', content: message }, { role: 'assistant', content: 'Cliente foi ao checkout.' }]
      void saveSession({ sessionId, pageUrl, pageTitle, wasProactive, messages: msgs, cartContext, wentToCheckout: true, request })
      return NextResponse.json({
        message: `Perfeito! Vou te levar para finalizar sua compra. 🎉\n\nSeu pedido tem ${cartContext.split(',').length} ${cartContext.split(',').length === 1 ? 'item' : 'itens'} — Total: R$${cartTotal.toFixed(2).replace('.', ',')}\n\nRedirecionando para o checkout…`,
        products: [], intent: 'cart_checkout', actions: ['checkout']
      })
    }

    // Passo 2: Buscar produtos no catálogo
    let products: any[] = []
    const productSelect = {
      id: true, name: true, slug: true, price: true,
      comparePrice: true, images: true, category: { select: { name: true, slug: true } }
    }

    // Mapa de sinônimos: termos genéricos → palavras relacionadas + categorias prováveis
    const SYNONYMS: Record<string, { terms: string[], categories: string[] }> = {
      'celular':     { terms: ['smartphone','iphone','samsung galaxy','motorola','xiaomi','android'], categories: ['celulares','smartphones','telefones'] },
      'smartphone':  { terms: ['celular','iphone','samsung','motorola','xiaomi'], categories: ['celulares','smartphones','telefones'] },
      'fone':        { terms: ['fone de ouvido','headphone','headset','earphone','tws','bluetooth'], categories: ['fones','áudio','headphones'] },
      'notebook':    { terms: ['laptop','computador portátil'], categories: ['notebooks','informática'] },
      'tv':          { terms: ['televisão','televisor','smart tv'], categories: ['tvs','televisores'] },
      'geladeira':   { terms: ['refrigerador','freezer'], categories: ['eletrodomésticos','refrigeração'] },
      'roupa':       { terms: ['camiseta','calça','vestido','blusa','camisa'], categories: ['roupas','vestuário','moda'] },
      'tenis':       { terms: ['tênis','sapato','calçado','sneaker'], categories: ['calçados','tênis'] },
      'perfume':     { terms: ['colônia','eau de toilette','fragrância'], categories: ['perfumes','beleza'] },
    }

    const expandQuery = (q: string): { terms: string[], categoryNames: string[] } => {
      const lower = q.toLowerCase().trim()
      for (const [key, val] of Object.entries(SYNONYMS)) {
        if (lower.includes(key)) {
          return { terms: [q, ...val.terms], categoryNames: val.categories }
        }
      }
      return { terms: [q], categoryNames: [] }
    }

    if (searchFilters.intent === 'catalog') {
      // Browsing geral — mostrar destaques ou mais recentes
      products = await prisma.product.findMany({
        where: { active: true, approvalStatus: 'APPROVED', featured: true },
        select: productSelect,
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
      // Se não tiver destaque, pega os mais recentes
      if (products.length === 0) {
        products = await prisma.product.findMany({
          where: { active: true, approvalStatus: 'APPROVED' },
          select: productSelect,
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      }
    } else if (searchFilters.intent === 'search') {
      const rawQuery = searchFilters.query?.trim() || message.trim()
      const { terms, categoryNames } = expandQuery(rawQuery)

      // Todas as keywords incluindo sinônimos
      const keywords = [...new Set(
        terms.flatMap(t => t.split(/\s+/)).filter(k => k.length > 2)
      )].slice(0, 8)

      const buildWhere = (kws: string[], useAnd: boolean) => {
        const base: any = { active: true, approvalStatus: 'APPROVED' }
        if (kws.length > 0) {
          const clauses = kws.map(kw => ({
            OR: [
              { name: { contains: kw } },
              { description: { contains: kw } },
              { brand: { contains: kw } },
            ]
          }))
          base[useAnd ? 'AND' : 'OR'] = useAnd ? clauses : clauses.flatMap((c: any) => c.OR)
        }
        if (searchFilters.maxPrice) base.price = { ...base.price, lte: searchFilters.maxPrice }
        if (searchFilters.minPrice) base.price = { ...base.price, gte: searchFilters.minPrice }
        return base
      }

      // 1. Busca por categoria informada pelo Gemini
      if (searchFilters.category) {
        const cat = await prisma.category.findFirst({ where: { name: { contains: searchFilters.category } } })
        if (cat) {
          products = await prisma.product.findMany({ where: { ...buildWhere(keywords, true), categoryId: cat.id }, select: productSelect, take: 6, orderBy: { featured: 'desc' } })
          if (products.length === 0)
            products = await prisma.product.findMany({ where: { active: true, approvalStatus: 'APPROVED', categoryId: cat.id }, select: productSelect, take: 6, orderBy: { featured: 'desc' } })
        }
      }

      // 2. Busca AND com sinônimos
      if (products.length === 0)
        products = await prisma.product.findMany({ where: buildWhere(keywords, true), select: productSelect, take: 6, orderBy: { featured: 'desc' } })

      // 3. Busca OR com sinônimos
      if (products.length === 0)
        products = await prisma.product.findMany({ where: buildWhere(keywords, false), select: productSelect, take: 6, orderBy: { featured: 'desc' } })

      // 4. Fallback por categorias do mapa de sinônimos
      if (products.length === 0 && categoryNames.length > 0) {
        for (const catName of categoryNames) {
          const cat = await prisma.category.findFirst({ where: { name: { contains: catName } } })
          if (cat) {
            products = await prisma.product.findMany({ where: { active: true, approvalStatus: 'APPROVED', categoryId: cat.id }, select: productSelect, take: 6, orderBy: { featured: 'desc' } })
            if (products.length > 0) break
          }
        }
      }

      // 5. Último recurso: 1ª keyword sem filtros de preço
      if (products.length === 0 && keywords.length > 0) {
        products = await prisma.product.findMany({
          where: { active: true, approvalStatus: 'APPROVED', OR: [{ name: { contains: keywords[0] } }, { description: { contains: keywords[0] } }] },
          select: productSelect, take: 6, orderBy: { featured: 'desc' }
        })
      }
    }

    // Passo 3: Montar contexto e gerar resposta
    const isCatalog = searchFilters.intent === 'catalog'
    const productContext = products.length > 0
      ? `\n\n${isCatalog ? 'Produtos em destaque no catálogo' : 'Produtos encontrados no catálogo'}:\n${products.map((p, i) =>
          `${i + 1}. "${p.name}" — R$${p.price.toFixed(2)} — /produtos/${p.slug}`
        ).join('\n')}`
      : searchFilters.intent === 'search'
        ? '\n\nNENHUM PRODUTO ENCONTRADO no catálogo da MydShop para esta busca. Informe ao cliente com simpatia, sugira termos alternativos ou navegar pelas categorias em https://mydshop.com.br. NUNCA invente produtos.'
        : ''

    const historyContext = history.slice(-4).map((m: ChatMessage) =>
      `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`
    ).join('\n')

    const responsePrompt = `
Você é a Mydi, assistente de compras virtual da MydShop, uma loja online brasileira.
Seja simpática, objetiva e comercial. Use no máximo 3 parágrafos curtos. Não use markdown excessivo.

REGRAS ABSOLUTAS — NUNCA QUEBRE ESTAS REGRAS:
1. JAMAIS invente, sugira ou mencione produtos que não estejam na lista abaixo.
2. Se a lista de produtos estiver vazia, diga que não encontrou nada e peça ao cliente tentar outros termos.
3. Só cite produtos pelo nome EXATO como aparecem na lista fornecida.
4. Nunca mencione marcas, modelos ou nomes de produtos por conta própria.
5. Você representa APENAS o catálogo da MydShop — não mencione outras lojas.
${isCatalog ? '6. O cliente quer conhecer o catálogo geral. Apresente os produtos em destaque listados abaixo de forma atrativa.' : ''}
${historyContext ? `\nHistórico recente:\n${historyContext}` : ''}
${productContext || '\n\nNENHUM PRODUTO ENCONTRADO no catálogo da MydShop. NÃO invente produtos. Informe ao cliente e sugira tentar palavras diferentes ou navegar pelas categorias.'}

Cliente pergunta: ${message}
`

    const aiResponse = await callGemini(responsePrompt)

    // Parsear imagens dos produtos
    const productsFormatted = products.map(p => {
      let image = ''
      try {
        const imgs = JSON.parse(p.images)
        image = Array.isArray(imgs) ? imgs[0] : imgs
      } catch { image = p.images }
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        comparePrice: p.comparePrice,
        image,
        category: p.category?.name
      }
    })

    // Definir actions para respostas com produtos
    const responseActions: string[] = []
    if (productsFormatted.length > 0) {
      responseActions.push('view_cart')
      responseActions.push('checkout')
    }

    // Persistir sessão em background (não bloqueia a resposta)
    const fullMessages = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    ]
    void saveSession({ sessionId, pageUrl, pageTitle, wasProactive, messages: fullMessages, cartContext, wentToCheckout: false, request })

    return NextResponse.json({
      message: aiResponse,
      products: productsFormatted,
      intent: searchFilters.intent,
      actions: responseActions.length > 0 ? responseActions : undefined
    })
  } catch (error: any) {
    console.error('[AI Chat]', error)
    return NextResponse.json({ error: 'Erro ao processar mensagem', message: 'Desculpe, tive um problema. Pode repetir sua pergunta?' }, { status: 500 })
  }
}
