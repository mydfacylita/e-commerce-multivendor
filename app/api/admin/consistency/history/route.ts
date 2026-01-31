/**
 * API - Histórico de Verificações de Consistência
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    // Buscar logs de consistência
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: 'CONSISTENCY_CHECK'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip
      }),
      prisma.auditLog.count({
        where: {
          action: 'CONSISTENCY_CHECK'
        }
      })
    ])

    // Agrupar por data para estatísticas
    const stats = await prisma.auditLog.groupBy({
      by: ['status'],
      where: {
        action: 'CONSISTENCY_CHECK',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 dias
        }
      },
      _count: {
        id: true
      }
    })

    const successCount = stats.find(s => s.status === 'SUCCESS')?._count.id || 0
    const failedCount = stats.find(s => s.status === 'FAILED')?._count.id || 0

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        orderId: log.resourceId,
        status: log.status,
        details: log.details,
        createdAt: log.createdAt
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      stats: {
        last7Days: {
          success: successCount,
          failed: failedCount,
          total: successCount + failedCount
        }
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
