/**
 * 🔒 TRATAMENTO SEGURO DE ERROS
 * 
 * Este módulo garante que erros internos NUNCA sejam expostos ao usuário final.
 * Funciona tanto para erros de banco de dados quanto para erros gerais.
 */

// Tipos de erro do Prisma (sem importar diretamente para evitar problemas)
const PRISMA_ERROR_CODES = {
  // Erros de conexão
  P1001: 'Não foi possível conectar ao banco de dados',
  P1002: 'Tempo de conexão esgotado',
  P1003: 'Banco de dados não encontrado',
  P1008: 'Operação excedeu o tempo limite',
  P1009: 'Banco de dados já existe',
  P1010: 'Acesso negado ao banco de dados',
  P1011: 'Erro ao abrir conexão TLS',
  P1012: 'Erro de schema',
  P1013: 'String de conexão inválida',
  P1014: 'Model não encontrado',
  P1015: 'Versão do Prisma incompatível',
  P1016: 'Parâmetros incorretos',
  P1017: 'Conexão fechada pelo servidor',
  
  // Erros de query
  P2000: 'Valor muito longo para o campo',
  P2001: 'Registro não encontrado',
  P2002: 'Violação de constraint única',
  P2003: 'Violação de chave estrangeira',
  P2025: 'Registro não encontrado para operação',
} as const

/**
 * Mensagens seguras para o usuário (sem expor detalhes internos)
 */
export const SAFE_ERROR_MESSAGES = {
  DATABASE_CONNECTION: 'Serviço temporariamente indisponível. Por favor, tente novamente em alguns minutos.',
  DATABASE_TIMEOUT: 'A requisição demorou muito. Por favor, tente novamente.',
  NOT_FOUND: 'O item solicitado não foi encontrado.',
  VALIDATION: 'Os dados enviados são inválidos.',
  UNAUTHORIZED: 'Você não tem permissão para acessar este recurso.',
  RATE_LIMIT: 'Muitas requisições. Por favor, aguarde um momento.',
  INTERNAL: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
  NETWORK: 'Erro de conexão. Verifique sua internet.',
} as const

/**
 * Interface para erro sanitizado
 */
export interface SanitizedError {
  message: string
  code: string
  statusCode: number
  // Nunca expor estes campos ao cliente
  _internal?: {
    originalMessage: string
    stack?: string
    prismaCode?: string
  }
}

/**
 * Verifica se é um erro do Prisma
 */
function isPrismaError(error: unknown): error is Error & { code?: string; meta?: unknown } {
  return (
    error instanceof Error &&
    (error.constructor.name.includes('Prisma') ||
      ('code' in error && typeof (error as { code: unknown }).code === 'string' && (error as { code: string }).code.startsWith('P')))
  )
}

/**
 * Verifica se é erro de conexão com banco
 */
function isConnectionError(error: unknown): boolean {
  if (!error) return false
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  
  return (
    errorMessage.includes('connection') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('etimedout') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes("can't reach database") ||
    errorMessage.includes('socket hang up') ||
    errorMessage.includes('p1001') ||
    errorMessage.includes('p1002') ||
    errorMessage.includes('p1008')
  )
}

/**
 * Sanitiza qualquer erro para retorno seguro ao cliente
 * 
 * @param error - O erro original
 * @param includeInternal - Se true, inclui detalhes internos (apenas para logs)
 * @returns Erro sanitizado seguro para o cliente
 */
export function sanitizeError(error: unknown, includeInternal = false): SanitizedError {
  // Erro de conexão com banco
  if (isConnectionError(error)) {
    const result: SanitizedError = {
      message: SAFE_ERROR_MESSAGES.DATABASE_CONNECTION,
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    }
    
    if (includeInternal && error instanceof Error) {
      result._internal = {
        originalMessage: error.message,
        stack: error.stack,
      }
    }
    
    return result
  }
  
  // Erro do Prisma
  if (isPrismaError(error)) {
    const prismaCode = (error as { code?: string }).code || ''
    const friendlyMessage = PRISMA_ERROR_CODES[prismaCode as keyof typeof PRISMA_ERROR_CODES]
    
    // Erros de conexão do Prisma
    if (prismaCode.startsWith('P1')) {
      return {
        message: SAFE_ERROR_MESSAGES.DATABASE_CONNECTION,
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        ...(includeInternal ? {
          _internal: {
            originalMessage: error.message,
            stack: error.stack,
            prismaCode,
          }
        } : {})
      }
    }
    
    // Registro não encontrado
    if (prismaCode === 'P2001' || prismaCode === 'P2025') {
      return {
        message: SAFE_ERROR_MESSAGES.NOT_FOUND,
        code: 'NOT_FOUND',
        statusCode: 404,
      }
    }
    
    // Violação de constraint (email duplicado, etc)
    if (prismaCode === 'P2002') {
      return {
        message: 'Este registro já existe.',
        code: 'CONFLICT',
        statusCode: 409,
      }
    }
    
    // Outros erros do Prisma - genérico
    return {
      message: SAFE_ERROR_MESSAGES.INTERNAL,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      ...(includeInternal ? {
        _internal: {
          originalMessage: error.message,
          stack: error.stack,
          prismaCode,
        }
      } : {})
    }
  }
  
  // Erro genérico
  if (error instanceof Error) {
    // Verificar por padrões conhecidos
    const msg = error.message.toLowerCase()
    
    if (msg.includes('unauthorized') || msg.includes('unauthenticated')) {
      return {
        message: SAFE_ERROR_MESSAGES.UNAUTHORIZED,
        code: 'UNAUTHORIZED',
        statusCode: 401,
      }
    }
    
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return {
        message: SAFE_ERROR_MESSAGES.RATE_LIMIT,
        code: 'RATE_LIMIT',
        statusCode: 429,
      }
    }
    
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return {
        message: SAFE_ERROR_MESSAGES.DATABASE_TIMEOUT,
        code: 'TIMEOUT',
        statusCode: 504,
      }
    }
    
    return {
      message: SAFE_ERROR_MESSAGES.INTERNAL,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      ...(includeInternal ? {
        _internal: {
          originalMessage: error.message,
          stack: error.stack,
        }
      } : {})
    }
  }
  
  // Erro desconhecido
  return {
    message: SAFE_ERROR_MESSAGES.INTERNAL,
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  }
}

/**
 * Log seguro de erro - para usar no servidor
 * Loga detalhes completos mas nunca os expõe ao cliente
 */
export function logError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const sanitized = sanitizeError(error, true)
  
  const logData = {
    context,
    code: sanitized.code,
    statusCode: sanitized.statusCode,
    timestamp: new Date().toISOString(),
    ...additionalData,
    // Em produção, enviar para serviço de monitoramento (Sentry, etc)
    // Em dev, mostrar detalhes no console
    ...(isProduction ? {} : {
      originalMessage: sanitized._internal?.originalMessage,
      stack: sanitized._internal?.stack,
      prismaCode: sanitized._internal?.prismaCode,
    })
  }
  
  if (isProduction) {
    // Em produção: log estruturado para análise
    console.error(JSON.stringify({
      level: 'error',
      ...logData,
      // Adicionar hash do erro para correlação
      errorHash: Buffer.from(sanitized._internal?.originalMessage || '').toString('base64').slice(0, 16),
    }))
    
    // TODO: Integrar com serviço de monitoramento (Sentry, DataDog, etc)
    // Sentry.captureException(error, { extra: logData })
  } else {
    // Em dev: log detalhado para debugging
    console.error(`\n🔴 [${context}] Error:`, logData)
    if (sanitized._internal?.stack) {
      console.error(sanitized._internal.stack)
    }
  }
}

/**
 * Wrapper para APIs - retorna resposta segura
 */
export function createSafeErrorResponse(error: unknown): Response {
  const sanitized = sanitizeError(error)
  
  return new Response(
    JSON.stringify({ 
      error: sanitized.message,
      code: sanitized.code,
    }),
    { 
      status: sanitized.statusCode,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Helper para usar em API routes
 * 
 * @example
 * export async function GET() {
 *   return withErrorHandler(async () => {
 *     const data = await prisma.user.findMany()
 *     return NextResponse.json(data)
 *   }, 'users.list')
 * }
 */
export async function withErrorHandler<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | Response> {
  try {
    return await fn()
  } catch (error) {
    logError(context, error)
    return createSafeErrorResponse(error)
  }
}
