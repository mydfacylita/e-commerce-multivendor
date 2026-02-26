import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(request)

  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode)
  if (!hasScope(auth, 'orders:read')) return devAuthError('Scope insuficiente. Necessário: orders:read', 403)

  try {
    // Valida filterConfig — null = admin ainda não liberou acesso
    const app = await prisma.developerApp.findUnique({
      where: { id: auth.appId! },
      select: { filterConfig: true }
    })
    if (app?.filterConfig === null || app?.filterConfig === undefined) {
      return devAuthError('Acesso não autorizado. O administrador ainda não configurou as permissões deste app.', 403)
    }
    const fc = (app.filterConfig as any)?.orders || {}

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          select: {
            id: true,
            product: { select: { id: true, name: true } },
            quantity: true,
            price: true,
            itemType: true,
            supplierStatus: true,
            trackingCode: true,
          }
        },
      }
    })

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

    // Verifica se o pedido está dentro do escopo permitido pelo filterConfig
    if (fc.warehouseCode && order.warehouseCode !== fc.warehouseCode) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }
    if (fc.sellerId && (order as any).sellerId !== fc.sellerId) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }
    if (fc.statuses?.length && !fc.statuses.includes(order.status)) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/orders/${params.id}`, statusCode: 200, latencyMs: Date.now() - start })
    return NextResponse.json({ data: order })
  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: `/api/v1/orders/${params.id}`, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(request)

  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode)
  if (!hasScope(auth, 'orders:write')) return devAuthError('Scope insuficiente. Necessário: orders:write', 403)

  // DELIVERED é definido pelo sistema via job de rastreamento, não pelo galpão/filial
  const ALLOWED_STATUSES = ['PROCESSING', 'SHIPPED', 'CANCELLED']

  try {
    // Valida filterConfig — null = admin ainda não liberou acesso
    const app = await prisma.developerApp.findUnique({
      where: { id: auth.appId! },
      select: { filterConfig: true }
    })
    if (app?.filterConfig === null || app?.filterConfig === undefined) {
      return devAuthError('Acesso não autorizado. O administrador ainda não configurou as permissões deste app.', 403)
    }
    const fc = (app.filterConfig as any)?.orders || {}

    // Verifica se o pedido está dentro do escopo antes de atualizar
    const existing = await prisma.order.findUnique({ where: { id: params.id }, select: { warehouseCode: true, sellerId: true, status: true, paymentStatus: true, trackingCode: true, shippingLabel: true } })
    if (!existing) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (fc.warehouseCode && existing.warehouseCode !== fc.warehouseCode) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (fc.sellerId && (existing as any).sellerId !== fc.sellerId) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

    const body = await request.json()
    const { status, trackingCode, shippingCarrier } = body

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Valores aceitos: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // ── Pré-requisito: SHIPPED exige trackingCode e etiqueta gerada ──
    if (status === 'SHIPPED') {
      const hasTracking = trackingCode || (existing as any).trackingCode
      if (!hasTracking) {
        await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'PATCH', path: `/api/v1/orders/${params.id}`, statusCode: 422, latencyMs: Date.now() - start, error: 'Etiqueta não gerada' })
        return NextResponse.json({
          error: 'Não é possível marcar como SHIPPED: etiqueta de transporte ainda não gerada.',
          prerequisite: 'Gere a etiqueta Correios primeiro usando POST /api/v1/labels/:orderId/generate, ou informe o campo "trackingCode" no corpo da requisição para transportadoras próprias.',
          nextStep: `/api/v1/labels/${params.id}/generate`
        }, { status: 422 })
      }
    }

    // Bloqueia separação se pagamento não foi confirmado
    if (status === 'PROCESSING' && existing.paymentStatus !== 'APPROVED') {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'PATCH', path: `/api/v1/orders/${params.id}`, statusCode: 422, latencyMs: Date.now() - start, error: 'Pagamento não aprovado' })
      return NextResponse.json(
        { error: 'Pagamento não aprovado. O pedido só pode ser separado após confirmação do pagamento.', paymentStatus: existing.paymentStatus },
        { status: 422 }
      )
    }

    // Se o app tem statuses restritos, só permite atualizar para status permitidos
    if (fc.statuses?.length && !fc.statuses.includes(status)) {
      return devAuthError(`Status "${status}" não permitido para este app`, 403)
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        ...(trackingCode && { trackingCode }),
        ...(shippingCarrier && { shippingCarrier }),
        updatedAt: new Date()
      },
      select: { id: true, status: true, trackingCode: true, shippingCarrier: true, updatedAt: true }
    })

    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'PATCH', path: `/api/v1/orders/${params.id}`, statusCode: 200, latencyMs: Date.now() - start })
    return NextResponse.json({ data: order })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'PATCH', path: `/api/v1/orders/${params.id}`, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
