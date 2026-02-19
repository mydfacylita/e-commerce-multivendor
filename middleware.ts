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
  '/api/app/config',
  '/api/app/products', // App móvel usa rota separada
  '/api/app/categories',
  '/api/shipping/calculate',
  '/api/shipping/quote',
]

// 🔓 Rotas públicas (webhooks, callbacks, etc) - sem autenticação
const PUBLIC_API_ROUTES = [
  '/api/webhooks/',
  '/api/auth/',
  '/api/config/public',
  '/api/config/maintenance-status',
  '/api/payment/webhook',
  '/api/payment/public-key',
  '/api/payment/gateways',
  '/api/payment/installments-rules',
  '/api/admin/mercadopago/webhook',
  '/api/products/', // Rotas de produto são públicas (reviews, questions, detalhes)
  '/api/public/', // Categorias, banners, etc
  '/api/categories', // Lista de categorias
  '/api/shipping/free-shipping-info',
  '/api/shipping/correios',
  '/api/location/',
  '/api/coupons/validate',
  '/api/feeds/',
  '/api/image/',
  '/api/analytics/track',
]

// 🚫 Rotas BLOQUEADAS em produção (debug, teste)
const BLOCKED_IN_PRODUCTION = [
  '/api/debug/',
  '/api/test/',
]

// 🔒 Rotas que REQUEREM autenticação ADMIN
const ADMIN_REQUIRED_ROUTES = [
  '/api/admin/',
  '/api/cron/', // Cron jobs só via admin ou secret
  '/api/social/', // Rotas de postagem em redes sociais (requer admin)
]

// 🔒 Rotas que REQUEREM autenticação de USUÁRIO
const USER_REQUIRED_ROUTES = [
  '/api/user/',
  '/api/orders',
  '/api/invoices/',
]

// 🔑 Secret para CRON jobs (configurar em produção!)
const CRON_SECRET = process.env.CRON_SECRET || ''

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
  // 🚀 CRITICAL: Desabilitar cache nas APIs para evitar dados desatualizados
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 🚀 BYPASS ABSOLUTO: Arquivos estáticos NUNCA passam pelo middleware
  // Isso garante que _next/static, imagens, etc funcionem em qualquer domínio/subdomínio
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }
  if (pathname.startsWith('/static/')) {
    return NextResponse.next()
  }
  // Arquivos com extensão comum
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.map', '.txt', '.json']
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next()
  }
  
  const origin = request.headers.get('origin')
  const host = request.headers.get('host') || ''
  const isAdminSubdomain = host.startsWith('gerencial-sys.')

  // 🔒 SEGURANÇA: Bloquear /admin no domínio principal
  // Apenas permite acesso via subdomínio gerencial-sys.mydshop.com.br
  if (pathname.startsWith('/admin')) {
    if (!isAdminSubdomain) {
      // Retorna 404 para esconder que a rota existe
      return new NextResponse(null, { status: 404 })
    }
  }

  // 🔒 SEGURANÇA: Subdomínio admin só pode acessar rotas /admin, /api e recursos estáticos
  // Bloqueia acesso a outras rotas (loja, carrinho, etc) pelo subdomínio admin
  if (isAdminSubdomain) {
    const allowedPaths = ['/admin', '/api/', '/_next/', '/favicon', '/logo', '/login']
    const isAllowed = allowedPaths.some(p => pathname.startsWith(p)) || pathname === '/'
    if (!isAllowed) {
      // Redireciona para /admin se tentar acessar outra rota no subdomínio admin
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // 🔒 Tratar preflight OPTIONS para CORS
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return setCorsHeaders(response, origin)
  }

  // 🔧 MODO MANUTENÇÃO (não verifica em rotas especiais ou no subdomínio admin)
  // Subdomínio admin nunca entra em manutenção para permitir gerenciamento
  const skipMaintenance = isAdminSubdomain || [
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
    // 🖼️ Rota de imagem gerencia seu próprio CORS (retorna binário)
    if (pathname.startsWith('/api/image/')) {
      return NextResponse.next()
    }
    
    // 🚫 BLOQUEAR rotas de debug/teste em produção
    if (process.env.NODE_ENV === 'production') {
      const isBlockedRoute = BLOCKED_IN_PRODUCTION.some(route => pathname.startsWith(route))
      if (isBlockedRoute) {
        console.warn(`🚫 [Security] Tentativa de acesso bloqueado em produção: ${pathname}`)
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }
    
    // 🔓 Verificar se é rota pública (webhooks, auth, etc)
    const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
    
    // 🔒 Verificar rotas de CRON (requerem secret OU admin)
    if (pathname.startsWith('/api/cron/')) {
      const cronSecret = request.headers.get('x-cron-secret')
      if (CRON_SECRET && cronSecret === CRON_SECRET) {
        // CRON secret válido
        const response = NextResponse.next()
        return setCorsHeaders(response, origin)
      }
      // Senão, precisa ser admin (verificado abaixo)
    }
    
    // 🔒 Verificar rotas de ADMIN
    const isAdminRoute = ADMIN_REQUIRED_ROUTES.some(route => pathname.startsWith(route))
    if (isAdminRoute) {
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        console.warn(`🚫 [Security] Acesso admin não autenticado: ${pathname}`)
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        )
      }
      
      // ✅ Permitir ADMIN e SELLER nas rotas de API admin
      // Sellers precisam acessar /api/admin/products, /api/admin/categories, etc
      // A validação específica de permissões é feita em cada rota
      if (token.role !== 'ADMIN' && token.role !== 'SELLER') {
        console.warn(`🚫 [Security] Acesso admin negado para role ${token.role}: ${pathname}`)
        return NextResponse.json(
          { error: 'Forbidden - Admin or Seller access required' },
          { status: 403 }
        )
      }
      
      const response = NextResponse.next()
      return setCorsHeaders(response, origin)
    }
    
    // 🔒 Verificar rotas de USUÁRIO
    const isUserRoute = USER_REQUIRED_ROUTES.some(route => pathname.startsWith(route))
    if (isUserRoute && !isPublicApiRoute) {
      // Permitir API Key como alternativa para apps mobile
      const apiKey = request.headers.get('x-api-key')
      if (apiKey) {
        // API Key será validada pela rota específica
        const response = NextResponse.next()
        return setCorsHeaders(response, origin)
      }
      
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        console.warn(`🚫 [Security] Acesso usuário não autenticado: ${pathname}`)
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        )
      }
      
      const response = NextResponse.next()
      return setCorsHeaders(response, origin)
    }
    
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
