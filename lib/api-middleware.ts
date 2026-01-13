// ========================================
// MIDDLEWARE HELPERS PARA APIS
// Validações de autenticação e autorização
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import { authOptions } from './auth'
import { 
  unauthorizedResponse, 
  forbiddenResponse,
  checkRateLimit,
  rateLimitResponse 
} from './validation'

export interface AuthResult {
  authorized: boolean
  session: Session | null
  response?: NextResponse
}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

/**
 * Valida se o usuário está autenticado
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return {
      authorized: false,
      session: null,
      response: NextResponse.json(
        unauthorizedResponse('Autenticação necessária'),
        { status: 401 }
      )
    }
  }
  
  return {
    authorized: true,
    session
  }
}

/**
 * Valida se o usuário é admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return {
      authorized: false,
      session: null,
      response: NextResponse.json(
        unauthorizedResponse('Autenticação necessária'),
        { status: 401 }
      )
    }
  }
  
  if (session.user.role !== 'ADMIN') {
    return {
      authorized: false,
      session,
      response: NextResponse.json(
        forbiddenResponse('Apenas administradores têm acesso'),
        { status: 403 }
      )
    }
  }
  
  return {
    authorized: true,
    session
  }
}

/**
 * Valida se o usuário é seller
 */
export async function requireSeller(request: NextRequest): Promise<AuthResult> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return {
      authorized: false,
      session: null,
      response: NextResponse.json(
        unauthorizedResponse('Autenticação necessária'),
        { status: 401 }
      )
    }
  }
  
  if (session.user.role !== 'SELLER') {
    return {
      authorized: false,
      session,
      response: NextResponse.json(
        forbiddenResponse('Apenas vendedores têm acesso'),
        { status: 403 }
      )
    }
  }
  
  return {
    authorized: true,
    session
  }
}

/**
 * Aplica rate limiting em uma rota
 */
export function applyRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; response?: NextResponse } {
  const result = checkRateLimit(identifier, config.maxRequests, config.windowMs)
  
  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        rateLimitResponse(result.resetAt),
        { status: 429, headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toString()
        }}
      )
    }
  }
  
  return { allowed: true }
}

/**
 * Helper combinado: Auth + Role + Rate Limit
 */
export async function validateRequest(
  request: NextRequest,
  options: {
    requireAuth?: boolean
    requireAdmin?: boolean
    requireSeller?: boolean
    rateLimit?: RateLimitConfig
  }
): Promise<{ valid: boolean; session?: Session; response?: NextResponse }> {
  
  // Validar autenticação/autorização
  let authResult: AuthResult | null = null
  
  if (options.requireAdmin) {
    authResult = await requireAdmin(request)
  } else if (options.requireSeller) {
    authResult = await requireSeller(request)
  } else if (options.requireAuth) {
    authResult = await requireAuth(request)
  }
  
  if (authResult && !authResult.authorized) {
    return {
      valid: false,
      response: authResult.response
    }
  }
  
  // Aplicar rate limiting
  if (options.rateLimit && authResult?.session?.user?.id) {
    const rateLimitResult = applyRateLimit(
      `${request.url}:${authResult.session.user.id}`,
      options.rateLimit
    )
    
    if (!rateLimitResult.allowed) {
      return {
        valid: false,
        session: authResult.session,
        response: rateLimitResult.response
      }
    }
  }
  
  return {
    valid: true,
    session: authResult?.session || undefined
  }
}

/**
 * Wrapper para rotas que facilita uso de middleware
 * 
 * @example
 * export const POST = withAuth(
 *   async (request, { session }) => {
 *     // seu código aqui
 *     return NextResponse.json({ data: 'ok' })
 *   },
 *   { requireAdmin: true, rateLimit: { maxRequests: 10, windowMs: 60000 } }
 * )
 */
export function withAuth(
  handler: (request: NextRequest, context: { session: Session }) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    requireAdmin?: boolean
    requireSeller?: boolean
    rateLimit?: RateLimitConfig
  } = {}
) {
  return async (request: NextRequest, routeContext?: any) => {
    const validation = await validateRequest(request, options)
    
    if (!validation.valid) {
      return validation.response!
    }
    
    return handler(request, { session: validation.session! })
  }
}

/**
 * Logs de segurança para auditoria
 */
export function logSecurityEvent(event: {
  type: 'unauthorized_access' | 'forbidden_access' | 'rate_limit_exceeded' | 'invalid_input' | 'suspicious_activity'
  userId?: string
  ip?: string
  path: string
  details?: any
}) {
  const timestamp = new Date().toISOString()
  
  // Em produção, enviar para sistema de logs centralizado
  console.warn(`[SECURITY] ${timestamp} - ${event.type}`, {
    userId: event.userId || 'anonymous',
    ip: event.ip || 'unknown',
    path: event.path,
    details: event.details
  })
  
  // TODO: Implementar envio para sistema de monitoramento
  // - Sentry, LogRocket, Datadog, etc
  // - Alertas automáticos para atividades suspeitas
  // - Dashboard de segurança
}
