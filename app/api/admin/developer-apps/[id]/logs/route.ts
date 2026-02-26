import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit  = Math.min(100, parseInt(searchParams.get('limit') || '50'))
  const skip   = (page - 1) * limit
  const status = searchParams.get('status') // "ok" | "error" | null (all)
  const method = searchParams.get('method') // GET, POST…
  const path   = searchParams.get('path')   // path substring

  // Verify app exists
  const app = await prisma.developerApp.findUnique({ where: { id: params.id }, select: { id: true, name: true } })
  if (!app) return NextResponse.json({ error: 'App não encontrado' }, { status: 404 })

  const where: any = { appId: params.id }
  if (status === 'ok')    where.statusCode = { gte: 200, lt: 400 }
  if (status === 'error') where.statusCode = { gte: 400 }
  if (method) where.method = method.toUpperCase()
  if (path)   where.path   = { contains: path }

  const [total, logs] = await Promise.all([
    prisma.devApiLog.count({ where }),
    prisma.devApiLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        keyPrefix: true,
        method: true,
        path: true,
        statusCode: true,
        latencyMs: true,
        ipAddress: true,
        userAgent: true,
        error: true,
        createdAt: true,
      },
    }),
  ])

  // Stats (last 24h)
  const since24h = new Date(Date.now() - 86_400_000)
  const [totalToday, errorsToday, avgLatency] = await Promise.all([
    prisma.devApiLog.count({ where: { appId: params.id, createdAt: { gte: since24h } } }),
    prisma.devApiLog.count({ where: { appId: params.id, createdAt: { gte: since24h }, statusCode: { gte: 400 } } }),
    prisma.devApiLog.aggregate({
      where: { appId: params.id, createdAt: { gte: since24h } },
      _avg: { latencyMs: true },
    }),
  ])

  return NextResponse.json({
    app: { id: app.id, name: app.name },
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    stats: {
      totalToday,
      errorsToday,
      errorRateToday: totalToday > 0 ? Math.round((errorsToday / totalToday) * 100) : 0,
      avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
    },
  })
}
