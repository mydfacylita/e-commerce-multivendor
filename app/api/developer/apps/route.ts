import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// GET - Listar apps do usuário
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const apps = await prisma.developerApp.findMany({
      where: { ownerId: session.user.id, status: { not: 'DELETED' } },
      include: {
        apiKeys: { select: { id: true, keyPrefix: true, name: true, isActive: true, lastUsedAt: true, requestCount: true, scopes: true, createdAt: true } },
        webhooks: { select: { id: true, url: true, events: true, isActive: true } },
        _count: { select: { apiLogs: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ data: apps })
  } catch (err: any) {
    // Tabelas ainda não existem (migration pendente)
    if (err?.code === 'P2021' || err?.message?.includes("doesn't exist")) {
      return NextResponse.json({ data: [], _migrationPending: true })
    }
    console.error('[developer/apps GET]', err)
    return NextResponse.json({ error: 'Erro interno', data: [] }, { status: 500 })
  }
}

// POST - Criar novo app
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, description, websiteUrl, redirectUris } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do app é obrigatório' }, { status: 400 })
    }

    const app = await prisma.developerApp.create({
      data: {
        name: name.trim(),
        description: description || null,
        websiteUrl: websiteUrl || null,
        redirectUris: JSON.stringify(Array.isArray(redirectUris) ? redirectUris : []),
        ownerId: session.user.id,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ data: app }, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2021' || err?.message?.includes("doesn't exist")) {
      return NextResponse.json({ error: 'Migration de banco pendente. Execute add-developer-portal.sql primeiro.' }, { status: 503 })
    }
    console.error('[developer/apps POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
