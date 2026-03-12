import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Prefixos/keys que NUNCA devem ser expostos (credenciais sensíveis)
const SENSITIVE_PREFIXES = [
  'correios.', 'mercadopago.', 'gateway.', 'smtp.', 'email.',
  'aliexpress.', 'shopify.', 'openai.', 'gemini.', 'ai.',
  'jwt.', 'secret', 'token', 'password', 'apikey', 'api_key',
  'private', 'credentials', 'oauth.',
]

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return SENSITIVE_PREFIXES.some(p => lower.startsWith(p) || lower.includes(p))
}

/**
 * API para buscar configurações do sistema
 * Requer autenticação de ADMIN para evitar vazamento de credenciais.
 * Para configurações públicas use /api/config/public
 */
export async function GET(request: NextRequest) {
  // Apenas ADMINs podem consultar configurações via essa rota genérica
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix')
    const keys = searchParams.get('keys')?.split(',').filter(Boolean)

    const where: any = {}
    
    if (prefix) {
      where.key = { startsWith: prefix }
    }
    
    if (keys && keys.length > 0) {
      where.key = { in: keys }
    }

    // Se não tiver filtro, não retornar nada (segurança)
    if (!prefix && (!keys || keys.length === 0)) {
      return NextResponse.json({ 
        error: 'Parâmetro prefix ou keys é obrigatório' 
      }, { status: 400 })
    }

    const configs = await prisma.systemConfig.findMany({
      where,
      select: {
        key: true,
        value: true,
      }
    })

    // Converter para objeto — nunca expor chaves sensíveis mesmo para ADMIN via essa rota
    const configMap: Record<string, any> = {}
    configs.forEach(config => {
      if (isSensitiveKey(config.key)) return // skip sensitive keys
      try {
        configMap[config.key] = JSON.parse(config.value)
      } catch {
        configMap[config.key] = config.value
      }
    })

    return NextResponse.json({ 
      configs: configMap,
      count: Object.keys(configMap).length
    })
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
