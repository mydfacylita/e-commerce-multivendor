import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { SCOPES, type Scope } from '@/lib/dev-auth'

// POST - Gerar nova API Key para o app
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verificar que o app pertence ao usuário
  const app = await prisma.developerApp.findFirst({
    where: { id: params.id, ownerId: session.user.id, status: { not: 'DELETED' } }
  })
  if (!app) return NextResponse.json({ error: 'App não encontrado' }, { status: 404 })

  const body = await request.json()
  const { name, scopes } = body

  // Validar scopes
  const validScopes = Object.keys(SCOPES) as Scope[]
  const invalid = (scopes || []).filter((s: string) => !validScopes.includes(s as Scope))
  if (!scopes?.length || invalid.length) {
    return NextResponse.json({
      error: `Scopes inválidos: ${invalid.join(', ')}. Permitidos: ${validScopes.join(', ')}`
    }, { status: 400 })
  }

  // Limitar 5 chaves ativas por app
  const activeKeys = await prisma.developerApiKey.count({
    where: { appId: params.id, isActive: true }
  })
  if (activeKeys >= 5) {
    return NextResponse.json({ error: 'Limite de 5 chaves ativas por app atingido' }, { status: 400 })
  }

  // Gerar chave e secret (exibidos UMA VEZ, depois só o hash é guardado)
  const rawKey    = `myd_live_${crypto.randomBytes(24).toString('hex')}`
  const rawSecret = crypto.randomBytes(32).toString('hex')
  const prefix    = rawKey.substring(0, 12) + '...'

  const hashedKey    = crypto.createHash('sha256').update(rawKey).digest('hex')
  const hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex')

  const apiKey = await prisma.developerApiKey.create({
    data: {
      appId: params.id,
      keyPrefix: prefix,
      apiKey: hashedKey,
      apiSecret: rawSecret, // Armazenamos o raw secret para validar HMAC
      scopes,
      name: name || null,
      updatedAt: new Date()
    }
  })

  return NextResponse.json({
    data: {
      id: apiKey.id,
      keyPrefix: prefix,
      name: apiKey.name,
      scopes,
      // ⚠️ Exibir APENAS neste momento — não é possível recuperar depois
      api_key: rawKey,
      api_secret: rawSecret,
    },
    warning: 'Guarde sua api_key e api_secret agora. Não será possível recuperá-los depois.'
  }, { status: 201 })
}

// DELETE - Revogar uma chave
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { keyId } = body

  const key = await prisma.developerApiKey.findFirst({
    where: { id: keyId, appId: params.id, app: { ownerId: session.user.id } }
  })
  if (!key) return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 })

  await prisma.developerApiKey.update({
    where: { id: keyId },
    data: { isActive: false, updatedAt: new Date() }
  })

  return NextResponse.json({ success: true })
}
