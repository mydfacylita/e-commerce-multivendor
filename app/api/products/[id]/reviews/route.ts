import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

/**
 * 🔐 Obtém usuário autenticado (suporta NextAuth e JWT Bearer token)
 */
async function getAuthenticatedUser(request: NextRequest): Promise<{ id: string; email?: string; role?: string } | null> {
  // 1. Tentar NextAuth primeiro (para web)
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email || undefined,
      role: (session.user as any).role || 'USER'
    }
  }

  // 2. Tentar JWT Bearer token (para app mobile)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email?: string; role?: string }
      return {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role || 'USER'
      }
    } catch (error) {
      console.error('[Reviews] JWT inválido:', error)
    }
  }

  return null
}

// GET - Listar avaliações de um produto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'recent' // recent, helpful, rating-high, rating-low

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

    // Ordenação
    let orderBy: any = { createdAt: 'desc' }
    switch (sortBy) {
      case 'helpful':
        orderBy = { helpfulCount: 'desc' }
        break
      case 'rating-high':
        orderBy = { rating: 'desc' }
        break
      case 'rating-low':
        orderBy = { rating: 'asc' }
        break
    }

    // Buscar avaliações aprovadas
    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: {
          productId,
          isApproved: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.productReview.count({
        where: {
          productId,
          isApproved: true
        }
      })
    ])

    // Calcular estatísticas
    const stats = await prisma.productReview.groupBy({
      by: ['rating'],
      where: {
        productId,
        isApproved: true
      },
      _count: true
    })

    const ratingDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    }
    let totalRating = 0
    let totalReviews = 0

    stats.forEach(s => {
      ratingDistribution[s.rating as keyof typeof ratingDistribution] = s._count
      totalRating += s.rating * s._count
      totalReviews += s._count
    })

    const averageRating = totalReviews > 0 ? (totalRating / totalReviews) : 0

    return NextResponse.json({
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        pros: r.pros,
        cons: r.cons,
        images: r.images ? JSON.parse(r.images) : [],
        isVerified: r.isVerified,
        helpfulCount: r.helpfulCount,
        sellerReply: r.sellerReply,
        sellerReplyAt: r.sellerReplyAt,
        createdAt: r.createdAt,
        user: {
          name: r.user.name || 'Anônimo',
          image: r.user.image
        }
      })),
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        distribution: ratingDistribution
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[Reviews GET] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar avaliações' },
      { status: 500 }
    )
  }
}

// POST - Criar avaliação
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticação híbrida (NextAuth ou JWT)
    const user = await getAuthenticatedUser(request)
    
    if (!user?.id) {
      return NextResponse.json(
        { message: 'Faça login para avaliar' },
        { status: 401 }
      )
    }

    const productId = params.id
    const body = await request.json()
    const { rating, title, comment, pros, cons, images, orderId } = body

    // Validações
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Avaliação deve ser de 1 a 5 estrelas' },
        { status: 400 }
      )
    }

    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se usuário comprou o produto (para marcar como verificado)
    let isVerified = false
    let validOrderId = null

    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId: user.id,
          status: 'DELIVERED',
          items: {
            some: { productId }
          }
        }
      })

      if (order) {
        isVerified = true
        validOrderId = order.id

        // Verificar se já avaliou este pedido
        const existingReview = await prisma.productReview.findFirst({
          where: {
            productId,
            userId: user.id,
            orderId: order.id
          }
        })

        if (existingReview) {
          return NextResponse.json(
            { message: 'Você já avaliou este produto para este pedido' },
            { status: 400 }
          )
        }
      }
    }

    // Criar avaliação
    const review = await prisma.productReview.create({
      data: {
        productId,
        userId: user.id,
        orderId: validOrderId,
        rating,
        title: title?.substring(0, 200),
        comment: comment?.substring(0, 2000),
        pros: pros?.substring(0, 500),
        cons: cons?.substring(0, 500),
        images: images ? JSON.stringify(images.slice(0, 5)) : null,
        isVerified,
        isApproved: true // Auto-aprovar por enquanto
      }
    })

    return NextResponse.json({
      message: 'Avaliação enviada com sucesso!',
      review: {
        id: review.id,
        rating: review.rating,
        isVerified: review.isVerified
      }
    })
  } catch (error) {
    console.error('[Reviews POST] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao enviar avaliação' },
      { status: 500 }
    )
  }
}
