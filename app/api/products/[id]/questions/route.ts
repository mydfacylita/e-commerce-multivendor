import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET - Listar perguntas de um produto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const filter = searchParams.get('filter') || 'all' // all, answered, unanswered

    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Filtro
    let whereCondition: any = {
      productId,
      isPublic: true,
      isApproved: true
    }

    if (filter === 'answered') {
      whereCondition.answer = { not: null }
    } else if (filter === 'unanswered') {
      whereCondition.answer = null
    }

    // Buscar perguntas
    const [questions, total, answeredCount, unansweredCount] = await Promise.all([
      prisma.productQuestion.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: [
          { answeredAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.productQuestion.count({ where: whereCondition }),
      prisma.productQuestion.count({
        where: { productId, isPublic: true, isApproved: true, answer: { not: null } }
      }),
      prisma.productQuestion.count({
        where: { productId, isPublic: true, isApproved: true, answer: null }
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
          name: q.user.name ? q.user.name.split(' ')[0] + '...' : 'Anônimo',
          image: q.user.image
        }
      })),
      stats: {
        total: answeredCount + unansweredCount,
        answered: answeredCount,
        unanswered: unansweredCount
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[Questions GET] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar perguntas' },
      { status: 500 }
    )
  }
}

// POST - Fazer pergunta
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Faça login para perguntar' },
        { status: 401 }
      )
    }

    const productId = params.id
    const body = await request.json()
    const { question } = body

    // Validações
    if (!question || question.trim().length < 10) {
      return NextResponse.json(
        { message: 'A pergunta deve ter pelo menos 10 caracteres' },
        { status: 400 }
      )
    }

    if (question.length > 500) {
      return NextResponse.json(
        { message: 'A pergunta deve ter no máximo 500 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true, name: true }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Verificar limite de perguntas por dia (anti-spam)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const questionsToday = await prisma.productQuestion.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: today }
      }
    })

    if (questionsToday >= 10) {
      return NextResponse.json(
        { message: 'Você atingiu o limite de 10 perguntas por dia' },
        { status: 429 }
      )
    }

    // Criar pergunta
    const newQuestion = await prisma.productQuestion.create({
      data: {
        productId,
        userId: session.user.id,
        question: question.trim().substring(0, 500),
        isApproved: true // Auto-aprovar por enquanto
      }
    })

    // TODO: Notificar vendedor sobre nova pergunta

    return NextResponse.json({
      message: 'Pergunta enviada! O vendedor será notificado.',
      question: {
        id: newQuestion.id,
        question: newQuestion.question,
        createdAt: newQuestion.createdAt
      }
    })
  } catch (error) {
    console.error('[Questions POST] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao enviar pergunta' },
      { status: 500 }
    )
  }
}
