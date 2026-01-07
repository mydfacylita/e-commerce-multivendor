import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { code, codeVerifier } = await req.json()

    if (!code) {
      return NextResponse.json(
        { message: 'Código de autorização não fornecido' },
        { status: 400 }
      )
    }

    if (!codeVerifier) {
      return NextResponse.json(
        { message: 'Code verifier não fornecido' },
        { status: 400 }
      )
    }

    // Buscar credenciais do banco de dados
    const credentials = await (prisma as any).mercadoLivreCredentials.findFirst()

    if (!credentials) {
      return NextResponse.json(
        { message: 'Credenciais do Mercado Livre não configuradas' },
        { status: 500 }
      )
    }

    const clientId = credentials.clientId
    const clientSecret = credentials.clientSecret
    const redirectUri = `${process.env.NEXTAUTH_URL}/admin/integracao/mercadolivre/callback`

    // Trocar código por token de acesso
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Erro ao obter token:', errorData)
      return NextResponse.json(
        { message: 'Erro ao obter token de acesso do Mercado Livre' },
        { status: 500 }
      )
    }

    const tokenData = await tokenResponse.json()

    // Calcular data de expiração
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    // Salvar ou atualizar autenticação no banco de dados
    await prisma.mercadoLivreAuth.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        mlUserId: tokenData.user_id.toString(),
      },
      create: {
        userId: session.user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        mlUserId: tokenData.user_id.toString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Autenticação realizada com sucesso',
      data: {
        user_id: tokenData.user_id,
        expires_in: tokenData.expires_in,
      },
    })
  } catch (error) {
    console.error('Erro no callback do Mercado Livre:', error)
    return NextResponse.json(
      { message: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
