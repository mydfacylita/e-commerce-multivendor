import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/api-middleware'
import { logError, sanitizeError } from '@/lib/error-handler'
import { validateApiKey } from '@/lib/api-security'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 🔐 Validar API Key
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
    const rateLimitResult = applyRateLimit(`categories:${ip}`, {
      maxRequests: 100,
      windowMs: 60000
    })
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    // 🔒 Log seguro - detalhes apenas no servidor
    logError('categories.list', error, { path: '/api/categories' })
    
    // 🔒 Retornar mensagem genérica - NUNCA expor stack trace
    const safeError = sanitizeError(error)
    return NextResponse.json(
      { error: safeError.message },
      { status: safeError.statusCode }
    )
  }
}
