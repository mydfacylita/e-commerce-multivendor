import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/seller/marketplaces/mercadolivre/auth
 * Troca o código de autorização por tokens de acesso usando credenciais globais
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar vendedor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { seller: true, workForSeller: true }
    })

    const seller = user?.seller || user?.workForSeller
    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    const { code, codeVerifier } = await request.json()

    if (!code || !codeVerifier) {
      return NextResponse.json({ error: 'Código ou code_verifier ausente' }, { status: 400 })
    }

    // Buscar credenciais GLOBAIS do sistema (configuradas pelo admin na página de integração ML)
    const mlCredentials = await (prisma as any).mercadoLivreCredentials.findFirst()

    if (!mlCredentials?.clientId || !mlCredentials?.clientSecret) {
      return NextResponse.json({ 
        error: 'Integração com Mercado Livre não configurada. Contate o administrador.' 
      }, { status: 400 })
    }

    const clientId = mlCredentials.clientId
    const clientSecret = mlCredentials.clientSecret

    // Usar domínio de produção para o redirect_uri (deve bater com o configurado no ML)
    const redirectUri = `https://mydshop.com.br/vendedor/integracao/mercadolivre/callback`

    // Trocar código por token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Erro ao obter token ML:', tokenData)
      return NextResponse.json({ 
        error: tokenData.message || 'Erro ao obter token de acesso' 
      }, { status: 400 })
    }

    const { access_token, refresh_token, expires_in, user_id } = tokenData

    // Buscar informações do usuário ML
    let nickname = null
    try {
      const userResponse = await fetch(`https://api.mercadolibre.com/users/${user_id}`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      })
      if (userResponse.ok) {
        const userData = await userResponse.json()
        nickname = userData.nickname
      }
    } catch (e) {
      // Ignorar erro
    }

    // Calcular expiração
    const expiresAt = new Date(Date.now() + (expires_in * 1000))

    // Salvar tokens do vendedor (não globais)
    // Cada vendedor tem seus próprios tokens vinculados à conta dele do ML
    await prisma.sellerMarketplaceCredential.upsert({
      where: {
        sellerId_marketplace: {
          sellerId: seller.id,
          marketplace: 'mercadolivre'
        }
      },
      create: {
        sellerId: seller.id,
        marketplace: 'mercadolivre',
        mlAccessToken: access_token,
        mlRefreshToken: refresh_token,
        mlExpiresAt: expiresAt,
        mlUserId: String(user_id),
        isActive: true
      },
      update: {
        mlAccessToken: access_token,
        mlRefreshToken: refresh_token,
        mlExpiresAt: expiresAt,
        mlUserId: String(user_id),
        isActive: true
      }
    })

    return NextResponse.json({ 
      success: true,
      userId: user_id,
      nickname: nickname
    })
  } catch (error: any) {
    console.error('Erro na autenticação ML:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
