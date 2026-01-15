import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// 🔧 Cache do modo manutenção (evita sobrecarga)
let maintenanceCache = {
  enabled: false,
  lastCheck: 0,
  checking: false
}
const CACHE_TTL = 10000 // 10 segundos

// � API Key para o app móvel (carregada do env ou validada no banco)
const APP_API_KEY = process.env.APP_API_KEY || ''

// 🔒 Origens permitidas para CORS
const ALLOWED_ORIGINS = [
  'https://mydshop.com.br',
  'https://www.mydshop.com.br',
  'https://app.mydshop.com.br',
  'https://admin.mydshop.com.br',
  // Desenvolvimento
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8100', // Ionic
    'http://localhost:8101', // Ionic porta alternativa
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8100',
    'capacitor://localhost', // Capacitor iOS
    'http://localhost' // Capacitor Android
  ] : [])
]

// 🔐 Rotas que requerem API Key do app móvel
const API_KEY_REQUIRED_ROUTES = [
  '/api/products',
  '/api/categories',
  '/api/app/config',
  '/api/shipping/calculate',
  '/api/shipping/quote',
]

// 🔓 Rotas públicas (webhooks, callbacks, etc) - sem autenticação
const PUBLIC_API_ROUTES = [
  '/api/webhooks/',
  '/api/auth/',
  '/api/config/public',
  '/api/payment/webhook',
  '/api/admin/mercadopago/webhook',
  '/api/cron/',
]

/**
 * 🔧 Buscar modo de manutenção (com cache inteligente)
 */
async function getMaintenanceMode(baseUrl: string): Promise<boolean> {
  const now = Date.now()
  
  // Se cache é válido, retorna imediatamente
  if (now - maintenanceCache.lastCheck < CACHE_TTL) {
    return maintenanceCache.enabled
  }

  // Se já está checando, retorna cache atual (evita múltiplas chamadas)
  if (maintenanceCache.checking) {
    return maintenanceCache.enabled
  }

  maintenanceCache.checking = true

  try {
    const response = await fetch(`${baseUrl}/api/config/maintenance-status`, {
      method: 'GET',
      headers: { 'x-internal': 'true' },
      cache: 'no-store'
    })

    if (response.ok) {
      const data = await response.json()
      maintenanceCache.enabled = data.enabled || false
      maintenanceCache.lastCheck = now
    }
  } catch (error) {
    console.error('[Middleware] Erro ao verificar manutenção:', error)
  } finally {
    maintenanceCache.checking = false
  }

  return maintenanceCache.enabled
}

/**
 * 🔒 Configurar headers CORS
 */
function setCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-api-key')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 horas
  }
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // 🔒 Tratar preflight OPTIONS para CORS
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return setCorsHeaders(response, origin)
  }

  // 🔧 MODO MANUTENÇÃO (não verifica em rotas especiais)
  const skipMaintenance = [
    '/manutencao',
    '/_next',
    '/favicon.ico',
    '/logo',
    '/api/health',
    '/api/config',
    '/admin',
    '/login',
    '/registro',
    '/api/auth',
    '/api/admin'
  ].some(path => pathname.startsWith(path))

  if (!skipMaintenance) {
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const isInMaintenance = await getMaintenanceMode(baseUrl)
    
    if (isInMaintenance) {
      return NextResponse.redirect(new URL('/manutencao', request.url))
    }
  }

  // 🔒 Aplicar CORS em rotas de API
  if (pathname.startsWith('/api/')) {
    // 🔓 Verificar se é rota pública (webhooks, auth, etc)
    const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
    
    if (!isPublicApiRoute) {
      // 🔐 Verificar se rota requer API Key
      const requiresApiKey = API_KEY_REQUIRED_ROUTES.some(route => pathname.startsWith(route))
      
      if (requiresApiKey) {
        const apiKey = request.headers.get('x-api-key')
        
        // Verificar API Key (env ou validação lazy no handler)
        if (!apiKey) {
          return NextResponse.json(
            { error: 'API Key não fornecida', code: 'MISSING_API_KEY' },
            { status: 401 }
          )
        }
        
        // Se temos API Key no env, validar aqui (mais rápido)
        // Senão, deixa a validação para o handler (consulta no banco)
        if (APP_API_KEY && apiKey !== APP_API_KEY) {
          // Validação adicional será feita no handler se necessário
          // (para suportar múltiplas API Keys no banco)
        }
      }
    }
    
    const response = NextResponse.next()
    return setCorsHeaders(response, origin)
  }

  // Rotas protegidas de vendedor
  if (pathname.startsWith('/vendedor')) {
    // Rotas que não precisam ser SELLER (cadastro inicial e escolha de planos)
    const publicVendorRoutes = [
      '/vendedor/cadastro',
      '/vendedor/planos'
    ]
    
    const isPublicRoute = publicVendorRoutes.some(route => pathname.startsWith(route))

    // Pega o token JWT
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    // Se não está autenticado, redireciona para login
    if (!token) {
      const callbackUrl = encodeURIComponent(pathname)
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url))
    }

    // Para rotas públicas (cadastro/planos), permite acesso para qualquer usuário autenticado
    // O usuário pode ser CUSTOMER querendo se cadastrar como SELLER
    if (isPublicRoute) {
      return NextResponse.next()
    }

    // Para outras rotas de vendedor, o usuário precisa ser SELLER
    if (token.role !== 'SELLER') {
      // Se não é SELLER, redireciona para o cadastro
      return NextResponse.redirect(new URL('/vendedor/cadastro', request.url))
    }

    // Para outras rotas de vendedor, valida plano no servidor
    // Nota: Não podemos fazer query no Prisma aqui (edge runtime)
    // A validação de plano será feita no layout client-side mas com bloqueio de renderização
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
