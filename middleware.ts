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

// 🚫 Cache da blocklist de IPs fraudulentos
let ipBlocklistCache = {
  ips: new Set<string>(),
  lastCheck: 0,
  checking: false
}
const BLOCKLIST_CACHE_TTL = 60000 // 1 minuto

async function getIpBlocklist(baseUrl: string): Promise<Set<string>> {
  const now = Date.now()
  if (now - ipBlocklistCache.lastCheck < BLOCKLIST_CACHE_TTL) return ipBlocklistCache.ips
  if (ipBlocklistCache.checking) return ipBlocklistCache.ips
  ipBlocklistCache.checking = true
  try {
    const res = await fetch(`${baseUrl}/api/config/ip-blocklist`, {
      method: 'GET',
      headers: { 'x-internal': 'true' },
      cache: 'no-store'
    })
    if (res.ok) {
      const data = await res.json()
      ipBlocklistCache.ips = new Set(data.blocklist || [])
      ipBlocklistCache.lastCheck = now
    }
  } catch { /* silencioso */ } finally { ipBlocklistCache.checking = false }
  return ipBlocklistCache.ips
}

// � API Key para o app móvel (carregada do env ou validada no banco)
const APP_API_KEY = process.env.APP_API_KEY || ''

// 🔒 Origens permitidas para CORS
const ALLOWED_ORIGINS = [
  'https://mydshop.com.br',
  'https://www.mydshop.com.br',
  'https://app.mydshop.com.br',
  'https://admin.mydshop.com.br',
  'https://developer.mydshop.com.br',
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
  '/api/config/ip-blocklist',
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
  '/api/v1/', // Portal de desenvolvedores — validação feita nas próprias rotas via dev-auth
  '/api/app/config', // Configurações de aparência do app (público - apenas branding)
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
 * 🔒 Aplicar headers de segurança HTTP
 * ISO 27001 A.14 — Segurança no desenvolvimento de sistemas
 * OWASP Secure Headers Project
 */
function setSecurityHeaders(response: NextResponse, isPage = false) {
  // Previne clickjacking (ISO 27001 A.14)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')

  // Previne sniffing de MIME type (XSS vector)
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Controla informações no Referer
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // HSTS — força HTTPS por 1 ano (ISO 27001 A.10 / A.13)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Desabilita features de browser desnecessárias
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(self)'
  )

  // NOTA: Content-Security-Policy é gerenciado pelo next.config.js
  // que já inclui Google Analytics, GTM, Facebook Pixel, Mercado Pago, etc.
  // NÃO definir CSP aqui para não sobrescrever o next.config.js.

  // Remove header que revela o servidor
  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')

  return response
}

/**
 * 🔒 Configurar headers CORS
 */
function setCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-api-key, X-Api-Signature, X-Timestamp')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 horas
  }
  // 🚀 CRITICAL: Desabilitar cache nas APIs para evitar dados desatualizados
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  setSecurityHeaders(response, false)
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🚫 IPs FRAUDULENTOS: sem bloqueio de página (clique já foi pago)
  // O drop dos eventos de analytics acontece silenciosamente no track-client/route.ts
  // Isso evita bloquear clientes reais com IPs compartilhados (NAT, VPN, etc)
  
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
  const isDeveloperSubdomain = host.startsWith('developer.')

  // 🔀 SUBDOMÍNIO DEVELOPER: reescreve requests para /developer/*
  if (isDeveloperSubdomain) {
    // Bloqueia rotas que não pertencem ao portal de desenvolvedores
    const allowedDevPaths = ['/developer', '/api/developer', '/api/v1', '/api/auth', '/_next', '/favicon', '/logo', '/login', '/registro']
    const isDevAllowed = allowedDevPaths.some(p => pathname.startsWith(p)) || pathname === '/'

    if (!isDevAllowed) {
      return new NextResponse(null, { status: 404 })
    }

    // No subdomínio developer: redireciona /login para /developer/login
    if (pathname === '/login' || pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/developer/login', request.url))
    }

    // Monta headers com x-page-type para o layout raiz pular Navbar/Footer
    // /registro mantém layout da loja; tudo mais no subdomínio developer usa tema dark
    const reqHeaders = new Headers(request.headers)
    if (!pathname.startsWith('/registro')) reqHeaders.set('x-page-type', 'developer')

    // Reescreve / → /developer, /dashboard → /developer/dashboard, etc.
    // Exclui /registro (rota que existe no root, não em /developer)
    if (!pathname.startsWith('/developer') && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/registro')) {
      const rewriteUrl = new URL(`/developer${pathname === '/' ? '' : pathname}`, request.url)
      rewriteUrl.search = request.nextUrl.search
      return NextResponse.rewrite(rewriteUrl, { request: { headers: reqHeaders } })
    }

    return NextResponse.next({ request: { headers: reqHeaders } })
  }

  // Injeta x-page-type: developer também para acesso direto via /developer
  if (pathname.startsWith('/developer')) {
    const reqHeaders = new Headers(request.headers)
    reqHeaders.set('x-page-type', 'developer')
    return NextResponse.next({ request: { headers: reqHeaders } })
  }

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
  const skipMaintenance = isAdminSubdomain || isDeveloperSubdomain || [
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

    // 🌐 /api/v1/ — API pública de desenvolvedores (CORS aberto, auth via dev-auth.ts)
    if (pathname.startsWith('/api/v1/')) {
      const response = NextResponse.next()
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Signature, X-Timestamp')
      return response
    }
    
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
      const pubRes = NextResponse.next()
      return setSecurityHeaders(pubRes, true)
    }

    // Para outras rotas de vendedor, o usuário precisa ser SELLER
    if (token.role !== 'SELLER') {
      // Se não é SELLER, redireciona para o cadastro
      return NextResponse.redirect(new URL('/vendedor/cadastro', request.url))
    }

    // Para outras rotas de vendedor, valida plano no servidor
    // Nota: Não podemos fazer query no Prisma aqui (edge runtime)
    // A validação de plano será feita no layout client-side mas com bloqueio de renderização
    const sellerRes = NextResponse.next()
    return setSecurityHeaders(sellerRes, true)
  }

  const finalRes = NextResponse.next()
  setSecurityHeaders(finalRes, true)
  return finalRes
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
