import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeProducts } from '@/lib/serialize'
import { applyRateLimit } from '@/lib/api-middleware'
import { sanitizeHtml } from '@/lib/validation'
import { logError, sanitizeError } from '@/lib/error-handler'
import { validateApiKey } from '@/lib/api-security'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Função para embaralhar array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Função para diversificar por categoria
function diversifyByCategory<T extends { categoryId?: string | null }>(products: T[]): T[] {
  // Agrupa por categoria
  const byCategory: Record<string, T[]> = {}
  const noCategory: T[] = []
  
  products.forEach(p => {
    if (p.categoryId) {
      if (!byCategory[p.categoryId]) byCategory[p.categoryId] = []
      byCategory[p.categoryId].push(p)
    } else {
      noCategory.push(p)
    }
  })
  
  // Embaralha cada grupo de categoria
  Object.keys(byCategory).forEach(key => {
    byCategory[key] = shuffleArray(byCategory[key])
  })
  
  // Intercala produtos de diferentes categorias
  const result: T[] = []
  const categories = shuffleArray(Object.keys(byCategory))
  let maxLength = Math.max(...categories.map(c => byCategory[c].length), noCategory.length)
  
  for (let i = 0; i < maxLength; i++) {
    // Adiciona um de cada categoria por rodada
    for (const cat of categories) {
      if (byCategory[cat][i]) {
        result.push(byCategory[cat][i])
      }
    }
    // Adiciona um sem categoria
    if (noCategory[i]) {
      result.push(noCategory[i])
    }
  }
  
  return result
}

// CORS é tratado pelo middleware global - não adicionar headers duplicados

// OPTIONS - Preflight para CORS (tratado pelo middleware)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function GET(request: NextRequest) {
  try {
    // 🔒 Validar API Key
    const apiKey = request.headers.get('x-api-key')
    const validation = await validateApiKey(apiKey)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'API Key inválida' },
        { status: 401 }
      )
    }

    // 🔒 Rate limiting: 100 requisições por minuto por IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const rateLimitResult = applyRateLimit(`products-paginated:${ip}`, {
      maxRequests: 100,
      windowMs: 60000
    })
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    // 🔒 Limitar máximo de resultados entre 1 e 100
    const requestedLimit = parseInt(searchParams.get('limit') || '12')
    const limit = Math.min(Math.max(requestedLimit, 1), 100)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    // 🔒 Sanitizar busca e limitar tamanho
    const rawSearch = searchParams.get('search') || searchParams.get('q')
    const search = rawSearch ? sanitizeHtml(rawSearch).substring(0, 100) : null
    
    // Novos filtros
    const minPrice = parseFloat(searchParams.get('minPrice') || '0') || 0
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '0') || 0
    const inStock = searchParams.get('inStock') === 'true'
    const onSale = searchParams.get('onSale') === 'true'
    const sort = searchParams.get('sort') || 'newest'
    
    // Parâmetros de randomização
    const shuffle = searchParams.get('shuffle') === 'true'
    const diversify = searchParams.get('diversify') === 'true'
    const seed = searchParams.get('seed') // Para consistência na sessão
    
    // Categorias de interesse do cliente (para priorizar)
    const interests = searchParams.get('interests')?.split(',').filter(Boolean) || []
    
    const skip = (page - 1) * limit

    // Construir filtro
    const where: any = { active: true }
    
    if (category) {
      where.categoryId = category
    }
    
    if (featured === 'true') {
      where.featured = true
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }
    
    // Filtro de preço
    if (minPrice > 0 || maxPrice > 0) {
      where.price = {}
      if (minPrice > 0) where.price.gte = minPrice
      if (maxPrice > 0) where.price.lte = maxPrice
    }
    
    // Filtro de estoque
    if (inStock) {
      where.stock = { gt: 0 }
    }
    
    // Filtro de promoção (produtos com comparePrice maior que price)
    if (onSale) {
      where.AND = [
        { comparePrice: { not: null } },
        { comparePrice: { gt: 0 } }
      ]
    }
    
    // Determinar ordenação
    let orderBy: any = { createdAt: 'desc' }
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'price-asc':
        orderBy = { price: 'asc' }
        break
      case 'price-desc':
        orderBy = { price: 'desc' }
        break
      case 'name-asc':
        orderBy = { name: 'asc' }
        break
      case 'name-desc':
        orderBy = { name: 'desc' }
        break
      case 'discount':
        // Para desconto, ordenamos por comparePrice desc (maior desconto potencial)
        orderBy = [{ comparePrice: 'desc' }, { createdAt: 'desc' }]
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    // Para shuffle/diversify, buscar mais produtos e depois filtrar
    const fetchLimit = (shuffle || diversify) ? Math.min(limit * 3, 300) : limit
    const fetchSkip = (shuffle || diversify) ? 0 : skip

    // Buscar produtos e contagem total em paralelo
    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { 
          category: true,
          supplier: true,  // Para identificar produtos importados
          seller: true  // Para identificação de origem (frete)
        },
        skip: fetchSkip,
        take: fetchLimit,
        orderBy,
      }),
      prisma.product.count({ where })
    ])

    let products = rawProducts
    
    // Aplicar diversificação por categoria (intercala produtos de diferentes categorias)
    if (diversify) {
      products = diversifyByCategory(products)
    }
    
    // Aplicar embaralhamento
    if (shuffle) {
      products = shuffleArray(products)
    }
    
    // Se temos interesses, priorizar produtos dessas categorias (30% no topo)
    if (interests.length > 0 && products.length > 0) {
      const interestProducts = products.filter(p => 
        p.categoryId && interests.includes(p.categoryId)
      )
      const otherProducts = products.filter(p => 
        !p.categoryId || !interests.includes(p.categoryId)
      )
      
      // Mistura: 30% de interesse + 70% outros, embaralhados entre si
      const interestCount = Math.ceil(products.length * 0.3)
      const selectedInterest = shuffleArray(interestProducts).slice(0, interestCount)
      const selectedOther = shuffleArray(otherProducts).slice(0, products.length - selectedInterest.length)
      
      // Intercala os produtos de interesse com os outros
      products = []
      const maxLen = Math.max(selectedInterest.length, selectedOther.length)
      for (let i = 0; i < maxLen; i++) {
        if (selectedInterest[i]) products.push(selectedInterest[i])
        if (selectedOther[i]) products.push(selectedOther[i])
        if (selectedOther[i + 1]) products.push(selectedOther[i + 1]) // 2 outros para cada 1 interesse
      }
    }
    
    // Aplicar paginação após shuffle/diversify
    if (shuffle || diversify) {
      products = products.slice(skip, skip + limit)
    }

    const serializedProducts = serializeProducts(products)

    return NextResponse.json({
      products: serializedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + products.length < total
    })
  } catch (error) {
    // 🔒 Log seguro - detalhes apenas no servidor
    logError('products.paginated', error, { path: '/api/products/paginated' })
    
    // 🔒 Retornar mensagem genérica - NUNCA expor stack trace
    const safeError = sanitizeError(error)
    return NextResponse.json(
      { error: safeError.message },
      { status: safeError.statusCode }
    )
  }
}
