import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeProducts } from '@/lib/serialize'
import { applyRateLimit } from '@/lib/api-middleware'
import { sanitizeHtml } from '@/lib/validation'
import { logError, sanitizeError } from '@/lib/error-handler'
import { validateApiKey } from '@/lib/api-security'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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
    const rawSearch = searchParams.get('search')
    const search = rawSearch ? sanitizeHtml(rawSearch).substring(0, 100) : null
    
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

    // Buscar produtos e contagem total em paralelo
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { 
          category: true,
          supplier: true,  // Para identificar produtos importados
          seller: true  // Para identificação de origem (frete)
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where })
    ])

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
