import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// POST /api/oauth/token
// Suporta: grant_type=authorization_code e grant_type=refresh_token
export async function POST(request: NextRequest) {
  let body: any
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    body = Object.fromEntries(new URLSearchParams(text))
  } else {
    body = await request.json()
  }

  const { grant_type, client_id, client_secret, code, redirect_uri, refresh_token } = body

  if (!grant_type || !client_id || !client_secret) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'grant_type, client_id e client_secret são obrigatórios' }, { status: 400 })
  }

  // Validar o app
  const app = await (prisma as any).oAuthApp.findUnique({ where: { clientId: client_id } })
  if (!app || app.status !== 'ACTIVE' || app.clientSecret !== client_secret) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
  }

  // ── AUTHORIZATION CODE ──────────────────────────────────────────────────────
  if (grant_type === 'authorization_code') {
    if (!code || !redirect_uri) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'code e redirect_uri são obrigatórios' }, { status: 400 })
    }

    const authCode = await (prisma as any).oAuthCode.findUnique({ where: { code } })
    if (!authCode) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Código inválido' }, { status: 400 })
    }
    if (authCode.used) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Código já utilizado' }, { status: 400 })
    }
    if (authCode.appId !== app.id) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Código não pertence a este app' }, { status: 400 })
    }
    if (authCode.redirectUri !== redirect_uri) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'redirect_uri não corresponde' }, { status: 400 })
    }
    if (new Date(authCode.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Código expirado' }, { status: 400 })
    }

    // Marcar code como usado
    await (prisma as any).oAuthCode.update({ where: { id: authCode.id }, data: { used: true } })

    // Criar tokens
    const accessToken  = 'myd_at_' + randomBytes(32).toString('hex')
    const refreshToken = 'myd_rt_' + randomBytes(32).toString('hex')
    const expiresAt    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias

    // Revogar conexão anterior se existir
    await (prisma as any).oAuthConnection.updateMany({
      where: { appId: app.id, userId: authCode.userId, revokedAt: null },
      data:  { revokedAt: new Date() }
    })

    const connection = await (prisma as any).oAuthConnection.create({
      data: {
        appId:        app.id,
        userId:       authCode.userId,
        accessToken,
        refreshToken,
        scopes:       authCode.scopes,
        expiresAt,
      }
    })

    return NextResponse.json({
      access_token:  connection.accessToken,
      token_type:    'Bearer',
      expires_in:    30 * 24 * 60 * 60,
      refresh_token: connection.refreshToken,
      scope:         JSON.parse(authCode.scopes).join(' '),
    })
  }

  // ── REFRESH TOKEN ───────────────────────────────────────────────────────────
  if (grant_type === 'refresh_token') {
    if (!refresh_token) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'refresh_token é obrigatório' }, { status: 400 })
    }

    const connection = await (prisma as any).oAuthConnection.findUnique({ where: { refreshToken: refresh_token } })
    if (!connection || connection.revokedAt) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Refresh token inválido ou revogado' }, { status: 400 })
    }
    if (connection.appId !== app.id) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Token não pertence a este app' }, { status: 400 })
    }

    // Rotar tokens
    const newAccessToken  = 'myd_at_' + randomBytes(32).toString('hex')
    const newRefreshToken = 'myd_rt_' + randomBytes(32).toString('hex')
    const newExpiresAt    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const updated = await (prisma as any).oAuthConnection.update({
      where: { id: connection.id },
      data: {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt:    newExpiresAt,
      }
    })

    return NextResponse.json({
      access_token:  updated.accessToken,
      token_type:    'Bearer',
      expires_in:    30 * 24 * 60 * 60,
      refresh_token: updated.refreshToken,
      scope:         JSON.parse(connection.scopes).join(' '),
    })
  }

  return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
}
