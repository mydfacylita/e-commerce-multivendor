import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/invoices
 * Lista todas as notas fiscais com filtros e paginação
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const valueMin = searchParams.get('valueMin')
    const valueMax = searchParams.get('valueMax')

    const where: any = {}

    if (status) where.status = status
    if (type) where.type = type

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    if (valueMin || valueMax) {
      where.valorTotal = {}
      if (valueMin) where.valorTotal.gte = parseFloat(valueMin)
      if (valueMax) where.valorTotal.lte = parseFloat(valueMax)
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { accessKey: { contains: search } },
        { order: { buyerCpf: { contains: search } } },
        { order: { buyerName: { contains: search } } }
      ]
    }

    const [invoices, total, stats] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              buyerName: true,
              buyerCpf: true,
              total: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.groupBy({
        by: ['status'],
        _count: true,
        _sum: { valorTotal: true }
      })
    ])

    const statsMap: Record<string, { count: number; total: number }> = {}
    for (const s of stats) {
      statsMap[s.status] = { count: s._count, total: s._sum.valorTotal || 0 }
    }

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: statsMap
    })
  } catch (error: any) {
    console.error('[API] Erro ao listar notas fiscais:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar notas fiscais' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/invoices/[id]
 * Cancelar uma nota fiscal
 */
