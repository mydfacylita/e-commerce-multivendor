import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Despachar pedido
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
    const body = await request.json()
    const { trackingCode } = body

    if (!trackingCode || !trackingCode.trim()) {
      return NextResponse.json({ message: 'Código de rastreio é obrigatório' }, { status: 400 })
    }

    // Verificar se pedido existe
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    }

    if (!order.packedAt) {
      return NextResponse.json({ message: 'Pedido precisa ser embalado primeiro' }, { status: 400 })
    }

    if (order.shippedAt) {
      return NextResponse.json({ message: 'Pedido já foi despachado' }, { status: 400 })
    }

    // Atualizar pedido
    await prisma.order.update({
      where: { id },
      data: {
        shippedAt: new Date(),
        shippedBy: session.user.email || session.user.name || 'admin',
        trackingCode: trackingCode.trim().toUpperCase(),
        status: 'SHIPPED'
      }
    })

    // TODO: Enviar e-mail para o cliente com o código de rastreio

    return NextResponse.json({ 
      success: true, 
      message: 'Pedido despachado com sucesso',
      trackingCode: trackingCode.trim().toUpperCase()
    })
  } catch (error) {
    console.error('Erro ao despachar pedido:', error)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
