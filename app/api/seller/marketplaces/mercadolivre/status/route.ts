import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar vendedor
    const seller = await prisma.seller.findFirst({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ 
        connected: false, 
        message: 'Vendedor não encontrado' 
      })
    }

    // Buscar credenciais do Mercado Livre
    const credentials = await prisma.sellerMarketplaceCredential.findUnique({
      where: {
        sellerId_marketplace: {
          sellerId: seller.id,
          marketplace: 'mercadolivre'
        }
      }
    })

    if (!credentials || !credentials.mlAccessToken) {
      return NextResponse.json({
        connected: false,
        message: 'Conecte sua conta do Mercado Livre'
      })
    }

    // Verificar se o token expirou
    const now = new Date()
    if (credentials.mlExpiresAt && credentials.mlExpiresAt < now) {
      return NextResponse.json({
        connected: false,
        message: 'Token expirado. Reconecte sua conta'
      })
    }

    return NextResponse.json({
      connected: true,
      message: 'Conectado ao Mercado Livre',
      mlUserId: credentials.mlUserId,
      expiresAt: credentials.mlExpiresAt?.toISOString()
    })
  } catch (error) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json({ 
      connected: false, 
      message: 'Erro ao verificar conexão' 
    }, { status: 500 })
  }
}
