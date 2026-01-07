import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Buscar autenticação do usuário
    const mlAuth = await prisma.mercadoLivreAuth.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    if (!mlAuth) {
      return NextResponse.json({
        connected: false,
        message: 'Nenhuma conta conectada',
      })
    }

    // Verificar se o token expirou
    const now = new Date()
    const isExpired = mlAuth.expiresAt < now

    if (isExpired) {
      // Buscar credenciais do banco
      const credentials = await (prisma as any).mercadoLivreCredentials.findFirst()

      if (!credentials) {
        return NextResponse.json({
          connected: false,
          message: 'Credenciais não configuradas',
        })
      }

      const clientId = credentials.clientId
      const clientSecret = credentials.clientSecret

      try {
        const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: mlAuth.refreshToken,
          }),
        })

        if (refreshResponse.ok) {
          const newTokenData = await refreshResponse.json()
          const newExpiresAt = new Date()
          newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokenData.expires_in)

          // Atualizar tokens no banco
          await prisma.mercadoLivreAuth.update({
            where: { userId: session.user.id },
            data: {
              accessToken: newTokenData.access_token,
              refreshToken: newTokenData.refresh_token,
              expiresAt: newExpiresAt,
            },
          })

          return NextResponse.json({
            connected: true,
            message: 'Conectado (token renovado)',
            mlUserId: mlAuth.mlUserId,
            expiresAt: newExpiresAt.toISOString(),
          })
        }
      } catch (error) {
        console.error('Erro ao renovar token:', error)
      }

      return NextResponse.json({
        connected: false,
        message: 'Token expirado. Reconecte sua conta.',
      })
    }

    return NextResponse.json({
      connected: true,
      message: 'Conectado',
      mlUserId: mlAuth.mlUserId,
      expiresAt: mlAuth.expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Erro ao verificar status ML:', error)
    return NextResponse.json(
      { message: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
