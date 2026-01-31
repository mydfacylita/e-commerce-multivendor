import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/returns
 * Nível: Administrative
 * Descrição: Lista solicitações de devolução para administradores
 * 
 * Seguindo API Governance:
 * - Apenas usuários ADMIN podem acessar
 * - Paginação e filtros
 * - Logs de audit trail
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION & AUTHORIZATION CHECK (Required - Administrative Level)
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Acesso negado. Login obrigatório.' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      console.warn(`[ADMIN_RETURNS] Tentativa de acesso negado. User: ${session.user.id} (${user?.role})`)
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      )
    }

    // 2. QUERY PARAMETERS
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    // 3. BUILD FILTERS
    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }

    if (search) {
      where.OR = [
        { orderId: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { order: { buyerEmail: { contains: search } } },
        { order: { buyerName: { contains: search } } }
      ]
    }

    // 4. FETCH RETURN REQUESTS
    const [requests, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          order: {
            include: {
              items: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.returnRequest.count({ where })
    ])

    // 5. AUDIT LOG
    console.log(`[AUDIT] Admin returns list accessed:`, {
      action: 'ADMIN_RETURNS_LIST',
      userId: session.user.id,
      userEmail: session.user.email,
      filters: { status, search },
      resultCount: requests.length,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('[ADMIN_RETURNS] Erro interno:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: (await getServerSession(authOptions))?.user?.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}