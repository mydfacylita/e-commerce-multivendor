import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/subscriptions
 * Lista todas as assinaturas com filtros
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sellerId = searchParams.get('sellerId')

    // Buscar assinaturas
    const subscriptions = await prisma.subscription.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(sellerId && { sellerId })
      },
      include: {
        seller: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        plan: {
          select: {
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ subscriptions })

  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar assinaturas' },
      { status: 500 }
    )
  }
}
