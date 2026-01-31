import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { packagingBoxId } = body

    // Verificar se o pedido pertence a este vendedor
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        items: {
          some: {
            product: {
              sellerId: seller.id
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (!order.separatedAt) {
      return NextResponse.json({ error: 'Pedido precisa ser separado primeiro' }, { status: 400 })
    }

    // Marcar como embalado
    await prisma.order.update({
      where: { id: params.id },
      data: {
        packedAt: new Date(),
        packagingBoxId: packagingBoxId || null,
        status: 'PROCESSING'
      }
    })

    return NextResponse.json({ success: true, message: 'Pedido embalado com sucesso' })
  } catch (error) {
    console.error('Erro ao embalar pedido:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
