import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validateApiKey } from '@/lib/api-security'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

// 🔒 Rate limiting simples em memória (em produção usar Redis)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutos

// 🔒 Origens permitidas (igual middleware.ts)
const ALLOWED_ORIGINS = [
  'https://mydshop.com.br',
  'https://www.mydshop.com.br',
  'https://app.mydshop.com.br',
  'capacitor://localhost',
  'http://localhost',
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8100',
    'http://localhost:8101',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8100'
  ] : [])
]

/**
 * 🔒 Configura headers de segurança na resposta
 */
function secureResponse(data: object, status: number, origin: string | null): NextResponse {
  const response = NextResponse.json(data, { status })
  
  // Headers de segurança
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  
  // CORS apenas para origens permitidas
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  return response
}

/**
 * 🔒 Verifica rate limiting por IP
 */
function checkRateLimit(ip: string): { blocked: boolean; remaining: number } {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)
  
  if (!attempt) {
    return { blocked: false, remaining: MAX_ATTEMPTS }
  }
  
  // Reset se passou o tempo de lockout
  if (now - attempt.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(ip)
    return { blocked: false, remaining: MAX_ATTEMPTS }
  }
  
  if (attempt.count >= MAX_ATTEMPTS) {
    return { blocked: true, remaining: 0 }
  }
  
  return { blocked: false, remaining: MAX_ATTEMPTS - attempt.count }
}

/**
 * 🔒 Registra tentativa de login falha
 */
function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)
  
  if (!attempt) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
  } else {
    loginAttempts.set(ip, { count: attempt.count + 1, lastAttempt: now })
  }
}

/**
 * 🔒 Limpa tentativas após login bem sucedido
 */
function clearAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

/**
 * 🔒 Valida formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * POST /api/auth/login
 * Endpoint unificado de autenticação para Web e Mobile
 * 🔐 Requer API Key válida
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  try {
    // 🔐 Validar API Key primeiro
    const apiKey = request.headers.get('x-api-key')
    const apiValidation = await validateApiKey(apiKey)
    
    if (!apiValidation.valid) {
      console.warn(`[LOGIN] API Key inválida - IP: ${ip}`)
      return secureResponse(
        { error: apiValidation.error || 'API Key inválida' },
        401,
        origin
      )
    }

    // 🔒 Verificar origem (bloquear requisições de origens não permitidas)
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`[LOGIN] Origem bloqueada: ${origin} - IP: ${ip}`)
      return secureResponse(
        { error: 'Acesso não autorizado' },
        403,
        null
      )
    }
    
    // 🔒 Rate limiting
    const rateCheck = checkRateLimit(ip)
    if (rateCheck.blocked) {
      console.warn(`[LOGIN] Rate limit atingido - IP: ${ip}`)
      return secureResponse(
        { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
        429,
        origin
      )
    }

    // Parse do body
    let body
    try {
      body = await request.json()
    } catch {
      return secureResponse(
        { error: 'Requisição inválida' },
        400,
        origin
      )
    }
    
    const { email, password } = body

    // 🔒 Validação rigorosa dos campos
    if (!email || !password) {
      return secureResponse(
        { error: 'Email e senha são obrigatórios' },
        400,
        origin
      )
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return secureResponse(
        { error: 'Formato inválido' },
        400,
        origin
      )
    }

    if (!isValidEmail(email)) {
      return secureResponse(
        { error: 'Email inválido' },
        400,
        origin
      )
    }

    if (password.length < 6 || password.length > 128) {
      return secureResponse(
        { error: 'Senha inválida' },
        400,
        origin
      )
    }

    // Buscar usuário com endereço padrão
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        addresses: {
          where: { isDefault: true },
          take: 1
        }
      }
    })

    // 🔒 Mensagem genérica para não revelar se email existe
    if (!user || !user.password) {
      recordFailedAttempt(ip)
      // Delay para dificultar timing attacks
      await new Promise(resolve => setTimeout(resolve, 500))
      return secureResponse(
        { error: 'Credenciais inválidas' },
        401,
        origin
      )
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      recordFailedAttempt(ip)
      console.warn(`[LOGIN] Senha incorreta - Email: ${email} - IP: ${ip}`)
      return secureResponse(
        { error: 'Credenciais inválidas' },
        401,
        origin
      )
    }

    // ✅ Login bem sucedido - limpar tentativas
    clearAttempts(ip)

    // 🔒 Gerar token JWT com claims mínimos
    const token = jwt.sign(
      {
        sub: user.id,  // Subject (id do usuário)
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        iss: 'mydshop'  // Issuer
      },
      JWT_SECRET,
      { 
        expiresIn: '7d',  // 7 dias (mais seguro que 30)
        algorithm: 'HS256'
      }
    )

    // Refresh token com validade maior
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        iss: 'mydshop'
      },
      JWT_SECRET,
      { 
        expiresIn: '30d',
        algorithm: 'HS256'
      }
    )

    // 🔒 Dados do usuário (apenas informações seguras)
    const defaultAddress = user.addresses?.[0]
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      phone: user.phone,
      role: user.role,
      address: defaultAddress ? {
        id: defaultAddress.id,
        label: defaultAddress.label,
        recipientName: defaultAddress.recipientName,
        street: defaultAddress.street,
        number: defaultAddress.street.match(/,?\s*(\d+)/)?.[1] || '',
        complement: defaultAddress.complement,
        neighborhood: defaultAddress.neighborhood,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zipCode: defaultAddress.zipCode,
        phone: defaultAddress.phone
      } : null
    }

    console.log(`[LOGIN] Sucesso - Email: ${email} - Role: ${user.role}`)

    return secureResponse({
      success: true,
      token,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 dias em segundos
      user: userData
    }, 200, origin)

  } catch (error) {
    console.error('[LOGIN] Erro interno:', error)
    return secureResponse(
      { error: 'Erro interno do servidor' },
      500,
      origin
    )
  }
}

/**
 * OPTIONS - Preflight CORS
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const response = new NextResponse(null, { status: 200 })
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  
  return response
}
