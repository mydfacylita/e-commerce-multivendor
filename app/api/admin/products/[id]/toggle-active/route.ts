import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { active: true }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { active: !product.active },
      select: { id: true, active: true }
    })

    return NextResponse.json({
      message: 'Status atualizado com sucesso',
      active: updated.active
    })
  } catch (error) {
    console.error('[Toggle Active] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar status do produto' },
      { status: 500 }
    )
  }
}
