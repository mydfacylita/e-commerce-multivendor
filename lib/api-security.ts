/**
 * 🔒 API SECURITY MODULE
 * 
 * Implementa proteção para APIs públicas:
 * - API Key validation
 * - JWT Token validation
 * - Rate Limiting
 * - Request signing (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

// Cache de rate limiting em memória (em produção, usar Redis)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

// Configurações
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests por minuto
const API_KEY_HEADER = 'x-api-key';
const AUTH_HEADER = 'authorization';
const APP_SIGNATURE_HEADER = 'x-app-signature';

// Interface do payload do JWT (formato de saída padronizado)
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

// Interface do payload decodificado do JWT (suporta ambos formatos)
interface DecodedJwtPayload {
  sub?: string;      // Formato padrão JWT (usado no login)
  userId?: string;   // Formato alternativo
  email: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

/**
 * Gera uma API Key única
 */
export function generateApiKey(): string {
  return `myd_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Gera um App Secret para assinatura
 */
export function generateAppSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Valida a API Key
 */
export async function validateApiKey(apiKey: string | null): Promise<{
  valid: boolean;
  appId?: string;
  appName?: string;
  error?: string;
}> {
  if (!apiKey) {
    return { valid: false, error: 'API Key não fornecida' };
  }

  try {
    // Buscar API Key no banco
    const appConfig = await prisma.systemConfig.findFirst({
      where: {
        key: 'api.keys',
      }
    });

    if (!appConfig) {
      // Se não há configuração, verificar se é a chave do app móvel
      const mobileAppKey = await prisma.systemConfig.findFirst({
        where: { key: 'app.apiKey' }
      });

      if (mobileAppKey && mobileAppKey.value === apiKey) {
        return { valid: true, appId: 'mobile-app', appName: 'MYDSHOP Mobile App' };
      }

      return { valid: false, error: 'API Key inválida' };
    }

    // Parsear lista de API Keys
    const apiKeys = JSON.parse(appConfig.value || '[]') as Array<{
      key: string;
      appId: string;
      appName: string;
      active: boolean;
    }>;

    const matchedKey = apiKeys.find(k => k.key === apiKey && k.active);

    if (!matchedKey) {
      return { valid: false, error: 'API Key inválida ou inativa' };
    }

    return {
      valid: true,
      appId: matchedKey.appId,
      appName: matchedKey.appName
    };
  } catch (error) {
    console.error('Erro ao validar API Key:', error);
    return { valid: false, error: 'Erro ao validar API Key' };
  }
}

/**
 * Rate Limiting por IP
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const record = rateLimitCache.get(identifier);

  // Limpar registros expirados periodicamente
  if (rateLimitCache.size > 10000) {
    const entries = Array.from(rateLimitCache.entries());
    for (const [key, value] of entries) {
      if (value.resetTime < now) {
        rateLimitCache.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // Novo período ou expirado
    rateLimitCache.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetIn: RATE_LIMIT_WINDOW
    };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - record.count,
    resetIn: record.resetTime - now
  };
}

/**
 * Gera assinatura para validação de request
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Valida assinatura do request
 */
export function validateSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Extrai IP do request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Middleware de segurança para APIs públicas
 */
export async function apiSecurityMiddleware(
  request: NextRequest,
  options: {
    requireApiKey?: boolean;
    requireSignature?: boolean;
    rateLimit?: boolean;
    allowedOrigins?: string[];
  } = {}
): Promise<{ success: boolean; response?: NextResponse; appId?: string }> {
  const {
    requireApiKey = true,
    requireSignature = false,
    rateLimit = true,
    allowedOrigins = []
  } = options;

  // 1. Verificar origem (CORS)
  const origin = request.headers.get('origin');
  if (allowedOrigins.length > 0 && origin) {
    if (!allowedOrigins.includes(origin) && !allowedOrigins.includes('*')) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Origem não permitida' },
          { status: 403 }
        )
      };
    }
  }

  // 2. Rate Limiting
  if (rateLimit) {
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: 'Limite de requisições excedido',
            retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(rateLimitResult.resetIn / 1000)),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetIn / 1000))
            }
          }
        )
      };
    }
  }

  // 3. Validar API Key
  if (requireApiKey) {
    const apiKey = request.headers.get(API_KEY_HEADER);
    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      return {
        success: false,
        response: NextResponse.json(
          { error: validation.error || 'API Key inválida' },
          { status: 401 }
        )
      };
    }

    return { success: true, appId: validation.appId };
  }

  return { success: true };
}

/**
 * Helper para criar resposta com headers de segurança
 */
export function secureResponse(
  data: any,
  options: {
    status?: number;
    rateLimit?: { remaining: number; resetIn: number };
  } = {}
): NextResponse {
  const { status = 200, rateLimit } = options;
  
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };

  if (rateLimit) {
    headers['X-RateLimit-Remaining'] = String(rateLimit.remaining);
    headers['X-RateLimit-Reset'] = String(Math.ceil(rateLimit.resetIn / 1000));
  }

  return NextResponse.json(data, { status, headers });
}

/**
 * 🔐 Valida token JWT do usuário
 */
export async function validateUserToken(authHeader: string | null): Promise<{
  valid: boolean;
  user?: JwtPayload;
  error?: string;
}> {
  if (!authHeader) {
    return { valid: false, error: 'Token de autenticação não fornecido' };
  }

  // Extrair token do header "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { valid: false, error: 'Formato de token inválido. Use: Bearer <token>' };
  }

  const token = parts[1];

  try {
    // Verificar e decodificar o token
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedJwtPayload;

    // Suportar ambos formatos: "sub" (padrão JWT) ou "userId"
    const userId = decoded.sub || decoded.userId;
    
    if (!userId) {
      return { valid: false, error: 'Token inválido: userId não encontrado' };
    }

    // Verificar se o usuário ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true }
    });

    if (!user) {
      return { valid: false, error: 'Usuário não encontrado' };
    }

    return {
      valid: true,
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name || undefined
      }
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expirado. Faça login novamente.' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Token inválido' };
    }
    console.error('Erro ao validar token:', error);
    return { valid: false, error: 'Erro ao validar token' };
  }
}

/**
 * 🔐 Middleware completo de segurança para APIs
 * Valida API Key + opcionalmente Token do usuário
 */
export async function apiAuthMiddleware(
  request: NextRequest,
  options: {
    requireApiKey?: boolean;
    requireUserToken?: boolean;
    allowedRoles?: string[];
    rateLimit?: boolean;
  } = {}
): Promise<{
  success: boolean;
  response?: NextResponse;
  appId?: string;
  user?: JwtPayload;
}> {
  const {
    requireApiKey = true,
    requireUserToken = false,
    allowedRoles = [],
    rateLimit = true
  } = options;

  // 1. Validar API Key
  if (requireApiKey) {
    const apiKey = request.headers.get(API_KEY_HEADER);
    const apiValidation = await validateApiKey(apiKey);

    if (!apiValidation.valid) {
      return {
        success: false,
        response: NextResponse.json(
          { error: apiValidation.error || 'API Key inválida', code: 'INVALID_API_KEY' },
          { status: 401 }
        )
      };
    }
  }

  // 2. Rate Limiting
  if (rateLimit) {
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: 'Limite de requisições excedido',
            retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(rateLimitResult.resetIn / 1000))
            }
          }
        )
      };
    }
  }

  // 3. Validar Token do usuário (se requerido)
  if (requireUserToken) {
    const authHeader = request.headers.get(AUTH_HEADER);
    const tokenValidation = await validateUserToken(authHeader);

    if (!tokenValidation.valid) {
      return {
        success: false,
        response: NextResponse.json(
          { error: tokenValidation.error || 'Não autenticado', code: 'UNAUTHORIZED' },
          { status: 401 }
        )
      };
    }

    // 4. Verificar role do usuário (se especificado)
    if (allowedRoles.length > 0 && tokenValidation.user) {
      if (!allowedRoles.includes(tokenValidation.user.role)) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Acesso negado. Permissão insuficiente.', code: 'FORBIDDEN' },
            { status: 403 }
          )
        };
      }
    }

    return { success: true, user: tokenValidation.user };
  }

  return { success: true };
}
