import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Listar perguntas dos produtos do vendedor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'unanswered'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Verificar se é vendedor, admin ou funcionário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        role: true, 
        workForSellerId: true,
        seller: { select: { id: true } }
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const isAdmin = user.role === 'ADMIN'
    const isSeller = !!user.seller
    const isEmployee = !!user.workForSellerId

    if (!isAdmin && !isSeller && !isEmployee) {
      return NextResponse.json(
        { message: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Determinar o sellerId a usar
    let targetSellerId: string | null = null
    if (isAdmin) {
      // Admin vê todas as perguntas ou pode filtrar por vendedor
      targetSellerId = searchParams.get('sellerId') || null
    } else if (isSeller) {
      targetSellerId = user.seller!.id
    } else if (isEmployee) {
      targetSellerId = user.workForSellerId
    }

    // Base where condition
    let whereCondition: any = {
      product: targetSellerId ? { sellerId: targetSellerId } : {},
      isApproved: true
    }

    // Filtro de respondidas/não respondidas
    if (filter === 'answered') {
      whereCondition.answer = { not: null }
    } else if (filter === 'unanswered') {
      whereCondition.answer = null
    }

    // Buscar perguntas
    const [questions, totalAnswered, totalUnanswered] = await Promise.all([
      prisma.productQuestion.findMany({
        where: whereCondition,
        include: {
          user: {
            select: { name: true }
          },
          product: {
            select: { id: true, name: true, slug: true }
          }
        },
        orderBy: [
          { answer: 'asc' }, // Não respondidas primeiro
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.productQuestion.count({
        where: {
          product: targetSellerId ? { sellerId: targetSellerId } : {},
          isApproved: true,
          answer: { not: null }
        }
      }),
      prisma.productQuestion.count({
        where: {
          product: targetSellerId ? { sellerId: targetSellerId } : {},
          isApproved: true,
          answer: null
        }
      })
    ])

    return NextResponse.json({
      questions: questions.map(q => ({
        id: q.id,
        question: q.question,
        answer: q.answer,
        answeredAt: q.answeredAt,
        createdAt: q.createdAt,
        user: {
          name: q.user.name || 'Cliente'
        },
        product: {
          id: q.product.id,
          name: q.product.name,
          slug: q.product.slug
        }
      })),
      stats: {
        total: totalAnswered + totalUnanswered,
        answered: totalAnswered,
        unanswered: totalUnanswered
      },
      pagination: {
        page,
        limit,
        total: filter === 'answered' ? totalAnswered : filter === 'unanswered' ? totalUnanswered : totalAnswered + totalUnanswered
      }
    })
  } catch (error) {
    console.error('[Vendedor Perguntas] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar perguntas' },
      { status: 500 }
    )
  }
}
