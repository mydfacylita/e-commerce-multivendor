import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { correiosCWS } from '@/lib/correios-cws'

/**
 * POST /api/admin/etiquetas/[id]/cancelar
 * Cancela uma pré-postagem nos Correios
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = params

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    const orderAny = order as any

    if (!orderAny.correiosIdPrePostagem) {
      return NextResponse.json({ error: 'Pré-postagem não encontrada' }, { status: 404 })
    }

    // Verificar se já foi postada
    if (order.shippedAt) {
      return NextResponse.json({ 
        error: 'Não é possível cancelar uma etiqueta já postada' 
      }, { status: 400 })
    }

    // Cancelar nos Correios
    const resultado = await correiosCWS.cancelarPrePostagem(orderAny.correiosIdPrePostagem)

    if (!resultado.success) {
      return NextResponse.json({ 
        error: resultado.error || 'Erro ao cancelar nos Correios' 
      }, { status: 400 })
    }

    // Limpar dados de rastreio do pedido
    await prisma.$executeRaw`UPDATE \`order\` SET trackingCode = NULL, correiosIdPrePostagem = NULL, labelPrintedAt = NULL, shippingLabel = NULL, shippingLabelType = NULL WHERE id = ${id}`

    return NextResponse.json({
      success: true,
      message: 'Etiqueta cancelada com sucesso!'
    })

  } catch (error: any) {
    console.error('Erro ao cancelar etiqueta:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
