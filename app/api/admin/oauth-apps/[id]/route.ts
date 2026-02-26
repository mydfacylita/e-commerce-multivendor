import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
}

// GET - Detalhes de um OAuth App
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const app = await (prisma as any).oAuthApp.findUnique({
      where: { id: params.id },
      include: {
        connections: {
          where: { revokedAt: null },
          select: {
            id: true,
            userId: true,
            scopes: true,
            expiresAt: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        _count: { select: { connections: true, authCodes: true } }
      }
    })
    if (!app) return NextResponse.json({ error: 'App não encontrado' }, { status: 404 })
    // Nunca retorna clientSecret na listagem
    const { clientSecret: _secret, ...safeApp } = app
    return NextResponse.json({ data: safeApp })
  } catch (err) {
    console.error('[admin/oauth-apps/:id GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar status ou configuração
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, logoUrl, redirectUris, scopes, appType, status } = body

    const data: any = {}
    if (name !== undefined)        data.name = name
    if (description !== undefined) data.description = description
    if (logoUrl !== undefined)     data.logoUrl = logoUrl
    if (appType !== undefined)     data.appType = appType
    if (status !== undefined)      data.status = status
    if (redirectUris !== undefined) {
      data.redirectUris = JSON.stringify(Array.isArray(redirectUris) ? redirectUris : [redirectUris])
    }
    if (scopes !== undefined) {
      const allowedScopes = ['orders:read', 'orders:write', 'products:read', 'products:write']
      const s: string[] = Array.isArray(scopes) ? scopes : []
      const invalid = s.filter(x => !allowedScopes.includes(x))
      if (invalid.length) return NextResponse.json({ error: `Scopes inválidos: ${invalid.join(', ')}` }, { status: 400 })
      data.scopes = JSON.stringify(s)
    }

    const updated = await (prisma as any).oAuthApp.update({
      where: { id: params.id },
      data
    })
    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[admin/oauth-apps/:id PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover app (revoga todas as conexões)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    // Cascade deleta códigos e conexões
    await (prisma as any).oAuthApp.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/oauth-apps/:id DELETE]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
