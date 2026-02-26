import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Inicia o fluxo OAuth do Facebook/Instagram
 * GET /api/social/meta/auth
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') || 'FACEBOOK'
    
    // Buscar credenciais do Facebook no banco de dados
    const [appIdConfig, appSecretConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'social.facebookAppId' } }),
      prisma.systemConfig.findUnique({ where: { key: 'social.facebookAppSecret' } })
    ])
    
    const appId = appIdConfig?.value || process.env.FACEBOOK_APP_ID
    const appSecret = appSecretConfig?.value || process.env.FACEBOOK_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://gerencial-sys.mydshop.com.br'}/api/social/meta/callback`
    
    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'Facebook App ID ou Secret não configurado. Configure em: Admin > Configurações > Redes Sociais' },
        { status: 500 }
      )
    }

    // Permissões necessárias
    const scopes = [
      'pages_show_list',           // Listar páginas
      'pages_read_engagement',     // Ler engajamento
      'pages_manage_posts',        // Gerenciar posts no Facebook
      'instagram_basic',           // Info básica Instagram
      'instagram_content_publish', // Publicar no Instagram
      'business_management'        // Gerenciar contas business
    ].join(',')

    // URL de autorização do Facebook
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', appId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', platform) // Passa o platform como state

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Erro ao iniciar OAuth:', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar autenticação' },
      { status: 500 }
    )
  }
}
