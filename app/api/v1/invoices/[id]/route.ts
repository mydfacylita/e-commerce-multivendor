import { NextRequest, NextResponse } from 'next/server'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(req)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode!)

  if (!hasScope(auth, 'invoices:read')) return devAuthError('Scope insuficiente: invoices:read', 403)

  try {
    const order = await prisma.order.findFirst({
      where: { id: params.id },
      select: {
        id: true, status: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true, status: true, type: true,
            invoiceNumber: true, accessKey: true,
            danfeUrl: true, issuedAt: true, series: true
          }
        }
      }
    })

    if (!order) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/invoices/${params.id}`, statusCode: 404, latencyMs: Date.now() - start })
      return devAuthError('Pedido não encontrado', 404)
    }

    const invoice = order.invoices[0]
    if (!invoice) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/invoices/${params.id}`, statusCode: 404, latencyMs: Date.now() - start })
      return devAuthError('Nota fiscal não disponível', 404)
    }

    await logDevApiCall({
      appId: auth.appId!, keyPrefix: auth.keyPrefix!,
      method: 'GET', path: `/api/v1/invoices/${params.id}`,
      statusCode: 200, latencyMs: Date.now() - start, ipAddress: req.headers.get('x-forwarded-for') ?? undefined
    })

    return NextResponse.json({
      data: {
        orderId: order.id,
        status: invoice.status,
        key: invoice.accessKey,
        number: invoice.invoiceNumber,
        series: invoice.series,
        issuedAt: invoice.issuedAt,
        url: invoice.danfeUrl,
      }
    })
  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/invoices/${params.id}`, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
