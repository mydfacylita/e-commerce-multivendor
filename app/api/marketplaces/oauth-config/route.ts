import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/marketplaces/oauth-config
 * Retorna as configurações públicas do OAuth dos marketplaces
 * (Apenas Client ID, NÃO o Secret)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar credenciais do Mercado Livre
    const mlCredentials = await (prisma as any).mercadoLivreCredentials.findFirst({
      select: {
        clientId: true,
        clientSecret: true  // apenas para verificar se existe
      }
    })

    return NextResponse.json({
      mercadoLivre: {
        clientId: mlCredentials?.clientId || null,
        redirectUri: null, // Será construído dinamicamente
        configured: !!mlCredentials?.clientId && !!mlCredentials?.clientSecret
      },
      shopee: {
        partnerId: null,
        configured: false
      }
    })
  } catch (error) {
    console.error('Erro ao buscar config OAuth:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
