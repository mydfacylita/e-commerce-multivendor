import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Responder pergunta
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { questionId } = params
    const body = await request.json()
    const { answer } = body

    // Validações
    if (!answer || answer.trim().length < 5) {
      return NextResponse.json(
        { message: 'A resposta deve ter pelo menos 5 caracteres' },
        { status: 400 }
      )
    }

    // Buscar pergunta
    const question = await prisma.productQuestion.findUnique({
      where: { id: questionId },
      include: {
        product: {
          select: { sellerId: true }
        }
      }
    })

    if (!question) {
      return NextResponse.json(
        { message: 'Pergunta não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão: admin ou dono do produto
    const isAdmin = session.user.role === 'ADMIN'
    const isSeller = question.product.sellerId === session.user.id

    if (!isAdmin && !isSeller) {
      // Verificar se é funcionário do vendedor
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { workForSellerId: true }
      })

      if (user?.workForSellerId !== question.product.sellerId) {
        return NextResponse.json(
          { message: 'Sem permissão para responder esta pergunta' },
          { status: 403 }
        )
      }
    }

    // Atualizar pergunta com resposta
    const updated = await prisma.productQuestion.update({
      where: { id: questionId },
      data: {
        answer: answer.trim().substring(0, 1000),
        answeredBy: session.user.id,
        answeredAt: new Date()
      }
    })

    // TODO: Notificar usuário que fez a pergunta

    return NextResponse.json({
      message: 'Pergunta respondida com sucesso!',
      question: {
        id: updated.id,
        answer: updated.answer,
        answeredAt: updated.answeredAt
      }
    })
  } catch (error) {
    console.error('[Answer Question] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao responder pergunta' },
      { status: 500 }
    )
  }
}
