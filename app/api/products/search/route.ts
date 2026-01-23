import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/api-middleware'
import { sanitizeHtml } from '@/lib/validation'
import { logError, sanitizeError } from '@/lib/error-handler'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 60 buscas por minuto por IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const rateLimitResult = applyRateLimit(`products-search:${ip}`, {
      maxRequests: 60,
      windowMs: 60000
    })
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response
    }

    const searchParams = request.nextUrl.searchParams
    const rawQuery = searchParams.get('q')

    // 🔒 Validar tamanho mínimo e máximo da busca
    if (!rawQuery || rawQuery.trim().length < 2 || rawQuery.length > 100) {
      return NextResponse.json({ products: [] })
    }

    // 🔒 Sanitizar query para prevenir XSS
    const query = sanitizeHtml(rawQuery.trim()).substring(0, 100)

    const productsRaw = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          {
            name: {
              contains: query
            }
          },
          {
            description: {
              contains: query
            }
          },
          {
            brand: {
              contains: query
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        images: true,
        stock: true
      },
      take: 10,
      orderBy: {
        name: 'asc'
      }
    })

    // Parse do campo images que vem como JSON string
    const products = productsRaw.map(product => {
      let images = []
      
      try {
        if (typeof product.images === 'string') {
          images = JSON.parse(product.images)
        } else if (Array.isArray(product.images)) {
          images = product.images
        }
      } catch (error) {
        console.error('Erro ao fazer parse de images:', error)
        images = []
      }

      // Garantir que é um array válido
      if (!Array.isArray(images)) {
        images = []
      }

      return {
        ...product,
        images
      }
    })

    return NextResponse.json({ products })
  } catch (error) {
    // 🔒 Log seguro - detalhes apenas no servidor
    logError('products.search', error, { path: '/api/products/search' })
    
    // 🔒 Retornar mensagem genérica - NUNCA expor stack trace
    const safeError = sanitizeError(error)
    return NextResponse.json(
      { error: safeError.message },
      { status: safeError.statusCode }
    )
  }
}
