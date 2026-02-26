import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// GET - Validar parâmetros do authorize (chamado pela página de consentimento)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId    = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const scope       = searchParams.get('scope') // "orders:read products:read"
  const state       = searchParams.get('state')
  const responseType = searchParams.get('response_type')

  if (responseType !== 'code') {
    return NextResponse.json({ error: 'unsupported_response_type' }, { status: 400 })
  }
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'client_id e redirect_uri são obrigatórios' }, { status: 400 })
  }

  const app = await (prisma as any).oAuthApp.findUnique({ where: { clientId } })
  if (!app || app.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 })
  }

  // Validar redirect_uri
  const allowedUris: string[] = JSON.parse(app.redirectUris)
  if (!allowedUris.includes(redirectUri)) {
    return NextResponse.json({ error: 'redirect_uri não autorizada' }, { status: 400 })
  }

  // Validar scopes
  const allowedScopes: string[] = JSON.parse(app.scopes)
  const requestedScopes = scope ? scope.split(' ').filter(Boolean) : allowedScopes
  const invalidScopes = requestedScopes.filter((s: string) => !allowedScopes.includes(s))
  if (invalidScopes.length) {
    return NextResponse.json({ error: `Scopes não autorizados: ${invalidScopes.join(', ')}` }, { status: 400 })
  }

  // Retorna info do app para a página de consentimento renderizar
  return NextResponse.json({
    app: {
      id: app.id,
      name: app.name,
      description: app.description,
      logoUrl: app.logoUrl,
      appType: app.appType,
    },
    requestedScopes,
    state,
    redirectUri,
  })
}

// POST - Vendedor aprova ou rejeita o acesso
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 })
  }

  const body = await request.json()
  const { client_id, redirect_uri, scope, state, approved } = body

  if (!approved) {
    // Usuário negou — redirecionar com error
    const url = new URL(redirect_uri)
    url.searchParams.set('error', 'access_denied')
    if (state) url.searchParams.set('state', state)
    return NextResponse.json({ redirect: url.toString() })
  }

  const app = await (prisma as any).oAuthApp.findUnique({ where: { clientId: client_id } })
  if (!app || app.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 })
  }

  // Verificar que o vendedor está ativo na plataforma
  const seller = await prisma.seller.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true }
  })
  if (!seller || seller.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Apenas vendedores ativos podem conectar apps externos.' }, { status: 403 })
  }

  const allowedUris: string[] = JSON.parse(app.redirectUris)
  if (!allowedUris.includes(redirect_uri)) {
    return NextResponse.json({ error: 'redirect_uri não autorizada' }, { status: 400 })
  }

  const allowedScopes: string[] = JSON.parse(app.scopes)
  const requestedScopes: string[] = scope ? scope.split(' ').filter(Boolean) : allowedScopes
  const invalid = requestedScopes.filter((s: string) => !allowedScopes.includes(s))
  if (invalid.length) {
    return NextResponse.json({ error: `Scopes inválidos: ${invalid.join(', ')}` }, { status: 400 })
  }

  // Gerar authorization code (expira em 10 minutos)
  const code = randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await (prisma as any).oAuthCode.create({
    data: {
      code,
      appId: app.id,
      userId: session.user.id,
      scopes: JSON.stringify(requestedScopes),
      redirectUri: redirect_uri,
      expiresAt,
      used: false,
    }
  })

  const url = new URL(redirect_uri)
  url.searchParams.set('code', code)
  if (state) url.searchParams.set('state', state)

  return NextResponse.json({ redirect: url.toString() })
}
