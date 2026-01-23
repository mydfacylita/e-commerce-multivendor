/**
 * API para listar reembolsos
 * GET /api/admin/refunds
 * 
 * Query params:
 * - status: PENDING | APPROVED | FAILED
 * - page: número da página
 * - limit: itens por página
 * 
 * Nível de segurança: 4 (Admin Only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Construir filtros
    const where: any = {}
    if (status) {
      where.status = status
    }

    // Buscar reembolsos
    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              total: true,
              paymentId: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.refund.count({ where })
    ])

    // Estatísticas
    const stats = await prisma.refund.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true }
    })

    const statusStats = {
      PENDING: { count: 0, amount: 0 },
      APPROVED: { count: 0, amount: 0 },
      FAILED: { count: 0, amount: 0 }
    }

    for (const stat of stats) {
      if (stat.status in statusStats) {
        statusStats[stat.status as keyof typeof statusStats] = {
          count: stat._count,
          amount: stat._sum.amount || 0
        }
      }
    }

    return NextResponse.json({
      refunds,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: statusStats
    })

  } catch (error) {
    console.error('[REFUNDS-LIST] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno ao listar reembolsos' },
      { status: 500 }
    )
  }
}
