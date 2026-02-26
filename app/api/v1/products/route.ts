import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const start = Date.now()
  const auth = await validateDevAuth(request)

  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode)
  if (!hasScope(auth, 'products:read')) return devAuthError('Scope insuficiente. Necessário: products:read', 403)

  const { searchParams } = new URL(request.url)
  const page    = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit   = Math.min(100, parseInt(searchParams.get('limit') || '20'))
  const search  = searchParams.get('search')
  const inStock = searchParams.get('in_stock')

  try {
    const where: any = { isActive: true }
    if (search) where.name = { contains: search }
    if (inStock === 'true') where.stock = { gt: 0 }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          stock: true,
          active: true,
          images: true,
          createdAt: true,
          category: { select: { id: true, name: true } },
        }
      }),
      prisma.product.count({ where })
    ])

    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: '/api/v1/products', statusCode: 200, latencyMs: Date.now() - start })
    return NextResponse.json({
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'GET', path: '/api/v1/products', statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
