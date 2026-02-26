import { NextRequest, NextResponse } from 'next/server'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const start = Date.now()
  const auth = await validateDevAuth(request)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode)
  if (!hasScope(auth, 'webhooks:manage')) return devAuthError('Scope insuficiente. Necessário: webhooks:manage', 403)

  const webhooks = await prisma.developerWebhook.findMany({
    where: { appId: auth.appId! },
    select: { id: true, url: true, events: true, isActive: true, lastTriggered: true, failCount: true, createdAt: true }
  })

  await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: '/api/v1/webhooks', statusCode: 200, latencyMs: Date.now() - start })
  return NextResponse.json({ data: webhooks })
}

export async function POST(request: NextRequest) {
  const start = Date.now()
  const auth = await validateDevAuth(request)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode)
  if (!hasScope(auth, 'webhooks:manage')) return devAuthError('Scope insuficiente. Necessário: webhooks:manage', 403)

  const ALLOWED_EVENTS = [
    'order.created', 'order.paid', 'order.shipped',
    'order.delivered', 'order.cancelled'
  ]

  try {
    const body = await request.json()
    const { url, events } = body

    if (!url || !events?.length) {
      return NextResponse.json({ error: 'Campos obrigatórios: url, events' }, { status: 400 })
    }
    const invalidEvents = events.filter((e: string) => !ALLOWED_EVENTS.includes(e))
    if (invalidEvents.length) {
      return NextResponse.json({
        error: `Eventos inválidos: ${invalidEvents.join(', ')}. Permitidos: ${ALLOWED_EVENTS.join(', ')}`
      }, { status: 400 })
    }

    // Limitar 10 webhooks por app
    const count = await prisma.developerWebhook.count({ where: { appId: auth.appId! } })
    if (count >= 10) {
      return NextResponse.json({ error: 'Limite de 10 webhooks por app atingido' }, { status: 400 })
    }

    const webhook = await prisma.developerWebhook.create({
      data: {
        appId: auth.appId!,
        url,
        events,
        secret: crypto.randomBytes(32).toString('hex'),
        updatedAt: new Date()
      }
    })

    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path: '/api/v1/webhooks', statusCode: 201, latencyMs: Date.now() - start })
    return NextResponse.json({ data: { id: webhook.id, url: webhook.url, events: webhook.events, secret: webhook.secret } }, { status: 201 })
  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path: '/api/v1/webhooks', statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
