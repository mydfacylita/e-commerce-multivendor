import { NextRequest, NextResponse } from 'next/server'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(request)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode)
  if (!hasScope(auth, 'webhooks:manage')) return devAuthError('Scope insuficiente. Necessário: webhooks:manage', 403)

  try {
    // Garante que o webhook pertence ao app atual
    const webhook = await prisma.developerWebhook.findFirst({
      where: { id: params.id, appId: auth.appId! }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })
    }

    await prisma.developerWebhook.delete({ where: { id: params.id } })
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'DELETE', path: `/api/v1/webhooks/${params.id}`, statusCode: 200, latencyMs: Date.now() - start })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'DELETE', path: `/api/v1/webhooks/${params.id}`, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
