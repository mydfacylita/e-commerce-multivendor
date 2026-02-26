import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Extrai e valida o Bearer token OAuth da requisição
async function resolveOAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer myd_at_')) return null

  const token = authHeader.replace('Bearer ', '').trim()
  const connection = await (prisma as any).oAuthConnection.findUnique({
    where: { accessToken: token },
    include: { app: true }
  })

  if (!connection)              return null
  if (connection.revokedAt)     return null
  if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) return null

  return {
    userId:  connection.userId,
    appId:   connection.appId,
    scopes:  JSON.parse(connection.scopes) as string[],
    appName: connection.app?.name || '',
  }
}

// GET /api/oauth/me
// Retorna dados do vendedor autenticado via OAuth token
export async function GET(request: NextRequest) {
  const auth = await resolveOAuthToken(request)
  if (!auth) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id:    true,
      name:  true,
      email: true,
      seller: {
        select: {
          id:          true,
          storeName:   true,
          storeSlug:   true,
          storeLogo:   true,
          sellerType:  true,
          status:      true,
          cidade:      true,
          estado:      true,
        }
      }
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
  }

  return NextResponse.json({
    id:     user.id,
    name:   user.name,
    email:  user.email,
    seller: user.seller,
    scopes: auth.scopes,
  })
}
