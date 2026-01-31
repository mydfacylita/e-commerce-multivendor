import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const method = searchParams.get('method')
    const statusCode = searchParams.get('statusCode')
    const userId = searchParams.get('userId')
    const sellerId = searchParams.get('sellerId')
    const endpoint = searchParams.get('endpoint')

    const where: any = {}

    if (method) where.method = method
    if (statusCode) where.statusCode = parseInt(statusCode)
    if (userId) where.userId = userId
    if (sellerId) where.sellerId = sellerId
    if (endpoint) where.endpoint = { contains: endpoint }

    const [logs, total] = await Promise.all([
      prisma.apiLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.apiLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao buscar logs:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar logs' },
      { status: 500 }
    )
  }
}

// Endpoint para limpar logs antigos (admin only)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')

    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - days)

    const result = await prisma.apiLog.deleteMany({
      where: {
        createdAt: {
          lt: dateLimit,
        },
      },
    })

    return NextResponse.json({
      message: `${result.count} logs excluídos com sucesso`,
      deleted: result.count,
    })
  } catch (error) {
    console.error('Erro ao excluir logs:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir logs' },
      { status: 500 }
    )
  }
}
