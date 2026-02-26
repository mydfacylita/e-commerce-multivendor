import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
}

// GET - Listar todos os OAuth Apps
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const apps = await (prisma as any).oAuthApp.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { connections: true, authCodes: true } }
      }
    })
    return NextResponse.json({ data: apps })
  } catch (err) {
    console.error('[admin/oauth-apps GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar novo OAuth App
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, logoUrl, redirectUris, scopes, appType } = body

    if (!name || !redirectUris || !scopes) {
      return NextResponse.json({ error: 'name, redirectUris e scopes são obrigatórios' }, { status: 400 })
    }

    const allowedScopes = ['orders:read', 'orders:write', 'products:read', 'products:write']
    const requestedScopes: string[] = Array.isArray(scopes) ? scopes : []
    const invalid = requestedScopes.filter(s => !allowedScopes.includes(s))
    if (invalid.length) {
      return NextResponse.json({ error: `Scopes inválidos: ${invalid.join(', ')}` }, { status: 400 })
    }

    const clientId     = 'myd_' + randomBytes(16).toString('hex')
    const clientSecret = 'myd_secret_' + randomBytes(32).toString('hex')

    const app = await (prisma as any).oAuthApp.create({
      data: {
        name,
        description: description || null,
        logoUrl: logoUrl || null,
        clientId,
        clientSecret,
        redirectUris: JSON.stringify(Array.isArray(redirectUris) ? redirectUris : [redirectUris]),
        scopes: JSON.stringify(requestedScopes),
        appType: appType || 'EXTERNAL',
        status: 'ACTIVE',
        createdBy: session.user.id,
      }
    })

    // Retorna clientSecret apenas na criação
    return NextResponse.json({ data: app }, { status: 201 })
  } catch (err) {
    console.error('[admin/oauth-apps POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
