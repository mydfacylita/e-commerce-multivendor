/**
 * 🔐 HELPER DE AUTENTICAÇÃO HÍBRIDA
 * 
 * Suporta autenticação via:
 * - JWT Token (app móvel)
 * - NextAuth Session (web)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateApiKey, validateUserToken, JwtPayload } from '@/lib/api-security';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
    isAdminStaff?: boolean;
  };
  error?: string;
  response?: NextResponse;
}

/**
 * Autentica o usuário via JWT ou Session
 * Também valida API Key se fornecida
 */
export async function authenticateRequest(
  request: NextRequest,
  options: {
    requireApiKey?: boolean;
    requireAuth?: boolean;
    allowedRoles?: string[];
  } = {}
): Promise<AuthResult> {
  const { 
    requireApiKey = true, 
    requireAuth = true,
    allowedRoles = []
  } = options;

  // 1. Validar API Key (se requerido)
  if (requireApiKey) {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      const apiValidation = await validateApiKey(apiKey);
      if (!apiValidation.valid) {
        return {
          authenticated: false,
          error: apiValidation.error || 'API Key inválida',
          response: NextResponse.json(
            { error: apiValidation.error || 'API Key inválida', code: 'INVALID_API_KEY' },
            { status: 401 }
          )
        };
      }
    }
  }

  // 2. Tentar autenticação por JWT (app móvel) ou Session (web)
  let userId: string | null = null;
  let userEmail: string | null = null;
  let userRole: string | null = null;
  let userName: string | null = null;
  let userIsAdminStaff = false;

  const authHeader = request.headers.get('authorization');
  
  if (authHeader) {
    // App móvel: usar JWT
    const tokenValidation = await validateUserToken(authHeader);
    if (tokenValidation.valid && tokenValidation.user) {
      userId = tokenValidation.user.userId;
      userEmail = tokenValidation.user.email;
      userRole = tokenValidation.user.role;
      userName = tokenValidation.user.name || null;
    } else if (requireAuth) {
      return {
        authenticated: false,
        error: tokenValidation.error || 'Token inválido',
        response: NextResponse.json(
          { error: tokenValidation.error || 'Token inválido', code: 'INVALID_TOKEN' },
          { status: 401 }
        )
      };
    }
  } else {
    // Web: usar Session
    const session = await getServerSession(authOptions);
    if (session?.user) {
      userId = session.user.id;
      userEmail = session.user.email || null;
      userRole = session.user.role;
      userName = session.user.name || null;
      userIsAdminStaff = session.user.isAdminStaff ?? false;
    }
  }

  // 3. Verificar se autenticação é obrigatória
  if (requireAuth && !userId) {
    return {
      authenticated: false,
      error: 'Não autorizado. Faça login para continuar.',
      response: NextResponse.json(
        { error: 'Não autorizado. Faça login para continuar.', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    };
  }

  // 4. Verificar role (se especificado)
  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return {
      authenticated: false,
      error: 'Acesso negado. Permissão insuficiente.',
      response: NextResponse.json(
        { error: 'Acesso negado. Permissão insuficiente.', code: 'FORBIDDEN' },
        { status: 403 }
      )
    };
  }

  return {
    authenticated: !!userId,
    userId: userId || undefined,
    user: userId ? {
      id: userId,
      email: userEmail || '',
      role: userRole || 'CUSTOMER',
      name: userName || undefined,
      isAdminStaff: userIsAdminStaff || undefined
    } : undefined
  };
}
