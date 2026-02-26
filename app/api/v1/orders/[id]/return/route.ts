import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'

/**
 * V1 — Trocas e Devoluções
 *
 * Pré-requisito: pedido deve estar com status DELIVERED.
 * A abertura do pedido de troca/devolução é feita pelo app do desenvolvedor
 * (galpão/filial) em nome do comprador.
 *
 * POST /api/v1/orders/:id/return  → Abrir pedido de troca/devolução
 * GET  /api/v1/orders/:id/return  → Consultar status do pedido
 */

// ── POST — Abrir pedido de troca ou devolução ──────────────────────────────
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(req)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode!)
  if (!hasScope(auth, 'orders:write')) return devAuthError('Scope insuficiente: orders:write', 403)

  const path = `/api/v1/orders/${params.id}/return`

  try {
    // Validar filterConfig do app
    const app = await prisma.developerApp.findUnique({
      where: { id: auth.appId! },
      select: { filterConfig: true }
    })
    if (!app?.filterConfig) return devAuthError('App sem permissões configuradas', 403)

    const fc = (app.filterConfig as any)?.orders || {}

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        status: true,
        warehouseCode: true,
        sellerId: true,
        items: { select: { id: true, product: { select: { name: true } }, quantity: true, price: true } },
        returnRequests: {
          where: { status: { in: ['PENDING', 'APPROVED'] } },
          select: { id: true, status: true, reason: true, requestedAt: true }
        }
      }
    })

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

    // Verificar escopo do app
    if (fc.warehouseCode && order.warehouseCode !== fc.warehouseCode) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }
    if (fc.sellerId && order.sellerId !== fc.sellerId) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Pré-requisito: pedido precisa estar entregue
    if (order.status !== 'DELIVERED') {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 422, latencyMs: Date.now() - start, error: 'Pedido não entregue' })
      return NextResponse.json({
        error: `Não é possível abrir troca/devolução: pedido com status "${order.status}".`,
        prerequisite: 'O pedido precisa estar com status DELIVERED para solicitar troca ou devolução.',
        orderStatus: order.status
      }, { status: 422 })
    }

    // Verificar se já há solicitação ativa
    if (order.returnRequests.length > 0) {
      const ativa = order.returnRequests[0]
      return NextResponse.json({
        error: 'Já existe uma solicitação de troca/devolução em andamento para este pedido.',
        existing: {
          id: ativa.id,
          status: ativa.status,
          reason: ativa.reason,
          requestedAt: ativa.requestedAt
        }
      }, { status: 409 })
    }

    const body = await req.json()
    const { type, reason, description, itemIds } = body

    // Validações básicas
    if (!type || !['RETURN', 'EXCHANGE'].includes(type)) {
      return NextResponse.json({
        error: 'Campo "type" obrigatório. Valores aceitos: RETURN (devolução) | EXCHANGE (troca).'
      }, { status: 400 })
    }
    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({
        error: 'Campo "reason" obrigatório (mínimo 5 caracteres). Descreva o motivo da troca/devolução.'
      }, { status: 400 })
    }

    // Validar itemIds se informados
    const orderItemIds = order.items.map(i => i.id)
    let itemIdsValidos: string[] = orderItemIds // Padrão: todos os itens

    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      const invalidos = itemIds.filter((id: string) => !orderItemIds.includes(id))
      if (invalidos.length > 0) {
        return NextResponse.json({
          error: `Item(ns) não encontrado(s) no pedido: ${invalidos.join(', ')}`,
          validItemIds: orderItemIds
        }, { status: 400 })
      }
      itemIdsValidos = itemIds
    }

    const tipoLabel = type === 'RETURN' ? '[DEVOLUÇÃO]' : '[TROCA]'
    const reasonFinal = `${tipoLabel} ${reason.trim()}`

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: order.userId || 'system',
        itemIds: JSON.stringify(itemIdsValidos),
        reason: reasonFinal,
        description: description?.trim() || null,
        status: 'PENDING',
        requestedAt: new Date()
      }
    })

    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 201, latencyMs: Date.now() - start })

    return NextResponse.json({
      data: {
        id: returnRequest.id,
        orderId: order.id,
        type,
        reason: reasonFinal,
        description: returnRequest.description,
        status: 'PENDING',
        itemIds: itemIdsValidos,
        requestedAt: returnRequest.requestedAt,
        message: `Solicitação de ${type === 'RETURN' ? 'devolução' : 'troca'} aberta com sucesso. Aguarde análise do administrador.`
      }
    }, { status: 201 })

  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}

// ── GET — Consultar status da solicitação ─────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(req)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode!)
  if (!hasScope(auth, 'orders:read')) return devAuthError('Scope insuficiente: orders:read', 403)

  const path = `/api/v1/orders/${params.id}/return`

  try {
    const app = await prisma.developerApp.findUnique({
      where: { id: auth.appId! },
      select: { filterConfig: true }
    })
    if (!app?.filterConfig) return devAuthError('App sem permissões configuradas', 403)
    const fc = (app.filterConfig as any)?.orders || {}

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        warehouseCode: true,
        sellerId: true,
        returnRequests: {
          orderBy: { requestedAt: 'desc' },
          select: {
            id: true,
            reason: true,
            description: true,
            status: true,
            adminNotes: true,
            requestedAt: true,
            reviewedAt: true,
            completedAt: true,
            itemIds: true
          }
        }
      }
    })

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

    if (fc.warehouseCode && order.warehouseCode !== fc.warehouseCode) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }
    if (fc.sellerId && order.sellerId !== fc.sellerId) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.returnRequests.length === 0) {
      return NextResponse.json({
        data: {
          orderId: order.id,
          hasReturn: false,
          message: 'Nenhuma solicitação de troca/devolução encontrada para este pedido.'
        }
      })
    }

    const returns = order.returnRequests.map(r => {
      const rawReason = r.reason || ''
      const type = rawReason.startsWith('[TROCA]') ? 'EXCHANGE'
                 : rawReason.startsWith('[DEVOLUÇÃO]') ? 'RETURN'
                 : 'UNKNOWN'

      // Parse inspection data stored in adminNotes
      let inspection: any = null
      let adminNotesClean: string | null = r.adminNotes || null
      if (r.adminNotes?.includes('[WAREHOUSE_INSPECTION]')) {
        try {
          const match = r.adminNotes.match(/\[WAREHOUSE_INSPECTION\]\n(\{[\s\S]*?\})(?:\n\n\[ADMIN_NOTES\]|$)/)
          if (match) {
            inspection = JSON.parse(match[1])
            // Extract clean admin notes if present
            const adminMatch = r.adminNotes.match(/\[ADMIN_NOTES\]\n([\s\S]+)$/)
            adminNotesClean = adminMatch ? adminMatch[1].trim() : null
          }
        } catch { /* ignore parse error */ }
      }

      return {
        id: r.id,
        type,
        reason: rawReason.replace(/^\[(TROCA|DEVOLUÇÃO)\] /, ''),
        description: r.description,
        status: r.status,
        adminNotes: adminNotesClean,
        inspection,             // null if not yet inspected
        itemIds: (() => { try { return JSON.parse(r.itemIds) } catch { return [] } })(),
        requestedAt: r.requestedAt,
        reviewedAt: r.reviewedAt,
        completedAt: r.completedAt
      }
    })

    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path, statusCode: 200, latencyMs: Date.now() - start })

    return NextResponse.json({
      data: {
        orderId: order.id,
        orderStatus: order.status,
        hasReturn: true,
        returns
      }
    })

  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
