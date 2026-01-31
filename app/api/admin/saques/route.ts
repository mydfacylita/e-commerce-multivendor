import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET - Listar todos os saques (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const sellerId = searchParams.get('sellerId')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (sellerId) {
      where.sellerId = sellerId
    }

    if (search) {
      where.OR = [
        { seller: { user: { name: { contains: search } } } },
        { seller: { user: { email: { contains: search } } } },
        { seller: { storeName: { contains: search } } }
      ]
    }

    const [withdrawals, total, stats] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          seller: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                  cpf: true
                }
              }
            }
          }
        }
      }),
      prisma.withdrawal.count({ where }),
      prisma.withdrawal.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          amount: true
        }
      })
    ])

    return NextResponse.json({
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    })

  } catch (error) {
    console.error('Erro ao listar saques:', error)
    return NextResponse.json({ 
      error: 'Erro ao listar saques',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
