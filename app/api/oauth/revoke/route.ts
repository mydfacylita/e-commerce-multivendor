import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/oauth/revoke
// Revoga um access_token ou refresh_token
export async function POST(request: NextRequest) {
  let body: any
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    body = Object.fromEntries(new URLSearchParams(text))
  } else {
    body = await request.json()
  }

  const { token, client_id, client_secret } = body

  if (!token || !client_id || !client_secret) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const app = await (prisma as any).oAuthApp.findUnique({ where: { clientId: client_id } })
  if (!app || app.clientSecret !== client_secret) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
  }

  // Tentar revogar por accessToken ou refreshToken
  const connection = await (prisma as any).oAuthConnection.findFirst({
    where: {
      appId: app.id,
      OR: [{ accessToken: token }, { refreshToken: token }],
      revokedAt: null,
    }
  })

  if (connection) {
    await (prisma as any).oAuthConnection.update({
      where: { id: connection.id },
      data:  { revokedAt: new Date() }
    })
  }

  // RFC 7009: sempre retorna 200 mesmo se token não existir
  return NextResponse.json({ success: true })
}
