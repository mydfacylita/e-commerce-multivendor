import { NextRequest, NextResponse } from 'next/server'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(req)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode!)

  if (!hasScope(auth, 'labels:read')) return devAuthError('Scope insuficiente: labels:read', 403)

  try {
    const order = await prisma.order.findFirst({
      where: { id: params.id },
      select: {
        id: true, status: true,
        shippingLabel: true,
        trackingCode: true,
      }
    })

    if (!order) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/labels/${params.id}`, statusCode: 404, latencyMs: Date.now() - start, ipAddress: req.headers.get('x-forwarded-for') ?? undefined })
      return devAuthError('Pedido não encontrado', 404)
    }

    if (!order.shippingLabel) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/labels/${params.id}`, statusCode: 404, latencyMs: Date.now() - start, ipAddress: req.headers.get('x-forwarded-for') ?? undefined })
      return devAuthError('Etiqueta não disponível', 404)
    }

    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/labels/${params.id}`, statusCode: 200, latencyMs: Date.now() - start, ipAddress: req.headers.get('x-forwarded-for') ?? undefined })

    return NextResponse.json({
      data: {
        orderId: order.id,
        trackingCode: order.trackingCode,
        label: order.shippingLabel,
      }
    })
  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/labels/${params.id}`, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
