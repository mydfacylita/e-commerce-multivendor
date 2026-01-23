import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// DELETE - Excluir pergunta (admin/vendedor)
export async function DELETE(
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
    const isSeller = user.seller?.id === question.product.sellerId
    const isEmployee = user.workForSellerId === question.product.sellerId

    if (!isAdmin && !isSeller && !isEmployee) {
      return NextResponse.json(
        { message: 'Sem permissão para excluir esta pergunta' },
        { status: 403 }
      )
    }

    // Excluir pergunta
    await prisma.productQuestion.delete({
      where: { id: questionId }
    })

    return NextResponse.json({
      message: 'Pergunta excluída com sucesso'
    })
  } catch (error) {
    console.error('[Delete Question] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir pergunta' },
      { status: 500 }
    )
  }
}
