import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

/**
 * Callback do OAuth do Facebook/Instagram
 * GET /api/social/meta/callback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') || 'FACEBOOK' // platform
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/marketing?error=${error}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/marketing?error=no_code`
      )
    }

    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/meta/callback`

    if (!appId || !appSecret) {
      throw new Error('Credenciais do Facebook não configuradas')
    }

    // 1. Trocar code por access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error.message)
    }

    const accessToken = tokenData.access_token

    // 2. Trocar por Long-Lived Token (60 dias)
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', appId)
    longLivedUrl.searchParams.set('client_secret', appSecret)
    longLivedUrl.searchParams.set('fb_exchange_token', accessToken)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    const longLivedData = await longLivedResponse.json()
    const longLivedToken = longLivedData.access_token

    // 3. Buscar páginas do usuário
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
    const pagesResponse = await fetch(pagesUrl)
    const pagesData = await pagesResponse.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/marketing?error=no_pages`
      )
    }

    // 4. Para cada página, salvar conexão
    const connections = []
    for (const page of pagesData.data) {
      // Buscar Instagram Business Account vinculado
      let instagramId = null
      let instagramUsername = null
      
      try {
        const igUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        const igResponse = await fetch(igUrl)
        const igData = await igResponse.json()
        
        if (igData.instagram_business_account) {
          instagramId = igData.instagram_business_account.id
          
          // Buscar username do Instagram
          const igDetailsUrl = `https://graph.facebook.com/v18.0/${instagramId}?fields=username,profile_picture_url,followers_count&access_token=${page.access_token}`
          const igDetailsResponse = await fetch(igDetailsUrl)
          const igDetails = await igDetailsResponse.json()
          instagramUsername = igDetails.username
        }
      } catch (err) {
        console.error('Erro ao buscar Instagram:', err)
      }

      // Calcular data de expiração (60 dias)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 60)

      // Salvar conexão do Facebook
      const fbConnection = await prisma.socialConnection.upsert({
        where: {
          platform_platformId: {
            platform: 'FACEBOOK',
            platformId: page.id
          }
        },
        update: {
          accessToken: page.access_token,
          expiresAt,
          isActive: true,
          metadata: {
            category: page.category,
            tasks: page.tasks
          }
        },
        create: {
          id: `fb_${page.id}_${Date.now()}`,
          platform: 'FACEBOOK',
          platformId: page.id,
          name: page.name,
          accessToken: page.access_token,
          expiresAt,
          isActive: true,
          metadata: {
            category: page.category,
            tasks: page.tasks
          }
        }
      })
      
      connections.push(fbConnection)

      // Se tem Instagram vinculado, salvar também
      if (instagramId && instagramUsername) {
        const igConnection = await prisma.socialConnection.upsert({
          where: {
            platform_platformId: {
              platform: 'INSTAGRAM',
              platformId: instagramId
            }
          },
          update: {
            accessToken: page.access_token, // Usa o token da página
            expiresAt,
            isActive: true,
            metadata: {
              username: instagramUsername,
              facebookPageId: page.id
            }
          },
          create: {
            id: `ig_${instagramId}_${Date.now()}`,
            platform: 'INSTAGRAM',
            platformId: instagramId,
            name: `@${instagramUsername}`,
            accessToken: page.access_token,
            expiresAt,
            isActive: true,
            metadata: {
              username: instagramUsername,
              facebookPageId: page.id
            }
          }
        })
        
        connections.push(igConnection)
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/marketing?connected=${connections.length}`
    )
  } catch (error) {
    console.error('Erro no callback OAuth:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/marketing?error=callback_failed`
    )
  }
}
