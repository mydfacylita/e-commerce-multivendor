import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

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
      console.error('[Helpful] JWT inválido:', error)
    }
  }

  return null
}

// POST /api/products/[id]/reviews/[reviewId]/helpful - Votar útil/não útil
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; reviewId: string } }
) {
  try {
    // 🔐 Autenticação híbrida (NextAuth ou JWT)
    const user = await getAuthenticatedUser(request)
    
    if (!user?.id) {
      return NextResponse.json(
        { message: 'Faça login para votar' },
        { status: 401 }
      )
    }

    const { isHelpful } = await request.json()

    if (typeof isHelpful !== 'boolean') {
      return NextResponse.json(
        { message: 'Valor inválido para isHelpful' },
        { status: 400 }
      )
    }

    // Verificar se a avaliação existe
    const review = await prisma.productReview.findUnique({
      where: { id: params.reviewId }
    })

    if (!review) {
      return NextResponse.json(
        { message: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    // Não pode votar na própria avaliação
    if (review.userId === user.id) {
      return NextResponse.json(
        { message: 'Você não pode votar na sua própria avaliação' },
        { status: 400 }
      )
    }

    // Verificar voto existente
    const existingVote = await prisma.reviewHelpful.findUnique({
      where: {
        reviewId_userId: {
          reviewId: params.reviewId,
          userId: user.id
        }
      }
    })

    if (existingVote) {
      // Atualizar voto existente
      if (existingVote.isHelpful !== isHelpful) {
        await prisma.reviewHelpful.update({
          where: { id: existingVote.id },
          data: { isHelpful }
        })

        // Atualizar contagem na avaliação
        const helpfulCount = isHelpful 
          ? review.helpfulCount + 1 
          : Math.max(0, review.helpfulCount - 1)
        
        await prisma.productReview.update({
          where: { id: params.reviewId },
          data: { helpfulCount }
        })

        return NextResponse.json({
          message: 'Voto atualizado',
          helpfulCount
        })
      } else {
        // Remover voto (toggle)
        await prisma.reviewHelpful.delete({
          where: { id: existingVote.id }
        })

        const helpfulCount = existingVote.isHelpful 
          ? Math.max(0, review.helpfulCount - 1)
          : review.helpfulCount

        await prisma.productReview.update({
          where: { id: params.reviewId },
          data: { helpfulCount }
        })

        return NextResponse.json({
          message: 'Voto removido',
          helpfulCount
        })
      }
    }

    // Criar novo voto
    await prisma.reviewHelpful.create({
      data: {
        reviewId: params.reviewId,
        userId: user.id,
        isHelpful
      }
    })

    // Atualizar contagem na avaliação
    const helpfulCount = isHelpful 
      ? review.helpfulCount + 1 
      : review.helpfulCount

    await prisma.productReview.update({
      where: { id: params.reviewId },
      data: { helpfulCount }
    })

    return NextResponse.json({
      message: isHelpful ? 'Marcado como útil' : 'Voto registrado',
      helpfulCount
    })

  } catch (error: any) {
    console.error('Erro ao votar:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
