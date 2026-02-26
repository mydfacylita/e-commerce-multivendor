import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'
import { OrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const start = Date.now()
  const auth = await validateDevAuth(request)

  if (!auth.valid) {
    return devAuthError(auth.error!, auth.statusCode)
  }
  if (!hasScope(auth, 'orders:read')) {
    return devAuthError('Scope insuficiente. Necessário: orders:read', 403)
  }

  const { searchParams } = new URL(request.url)
  const page   = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit  = Math.min(100, parseInt(searchParams.get('limit') || '20'))
  const status = searchParams.get('status')
  const from   = searchParams.get('from')
  const to     = searchParams.get('to')

  try {
    // Busca filterConfig do app para aplicar restrições de acesso
    const app = await prisma.developerApp.findUnique({
      where: { id: auth.appId! },
      select: { filterConfig: true }
    })

    // filterConfig null = admin ainda não liberou o acesso — bloqueia tudo
    if (app?.filterConfig === null || app?.filterConfig === undefined) {
      return devAuthError('Acesso não autorizado. O administrador ainda não configurou as permissões deste app.', 403)
    }

    let parsedConfig: any = {}
    try {
      parsedConfig = typeof app.filterConfig === 'string'
        ? JSON.parse(app.filterConfig)
        : (app.filterConfig || {})
    } catch {
      parsedConfig = {}
    }
    const fc = parsedConfig.orders || {}
    const where: any = {}

    // ── Aplica filtros do filterConfig (restrições do app) ──
    if (fc.warehouseCode)  where.warehouseCode = fc.warehouseCode
    if (fc.sellerId)       where.sellerId = fc.sellerId

    // Statuses: se nenhum status foi marcado → retorna vazio (acesso explícito obrigatório)
    const validStatuses = fc.statuses?.length
      ? (fc.statuses as string[]).filter(s => Object.values(OrderStatus).includes(s as OrderStatus))
      : []

    if (!validStatuses.length) {
      // Sem status selecionado = nenhum pedido visível
      return NextResponse.json({ data: [], pagination: { page: 1, limit, total: 0, pages: 0 } })
    }

    where.status = { in: validStatuses as OrderStatus[] }

    // ── Aplica filtros do request (dentro do que o app pode ver) ──
    if (status) {
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        return devAuthError(`Status "${status}" inválido. Valores aceitos: ${Object.values(OrderStatus).join(', ')}`, 400)
      }
      if (fc.statuses?.length && !fc.statuses.includes(status)) {
        return devAuthError(`Status "${status}" não permitido para este app`, 403)
      }
      where.status = status as OrderStatus
    }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to)
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          total: true,
          buyerName: true,
          buyerEmail: true,
          trackingCode: true,
          sentToSupplier: true,
          warehouseCode: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              product: { select: { name: true } },
              quantity: true,
              price: true,
            }
          }
        }
      }),
      prisma.order.count({ where })
    ])

    await logDevApiCall({
      appId: auth.appId!,
      keyPrefix: auth.keyPrefix!,
      method: 'GET',
      path: '/api/v1/orders',
      statusCode: 200,
      latencyMs: Date.now() - start,
    })

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    await logDevApiCall({
      appId: auth.appId!,
      keyPrefix: auth.keyPrefix!,
      method: 'GET',
      path: '/api/v1/orders',
      statusCode: 500,
      latencyMs: Date.now() - start,
      error: error.message
    })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
