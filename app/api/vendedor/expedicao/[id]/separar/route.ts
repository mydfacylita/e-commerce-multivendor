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

    // Verificar se o pedido pertence a este vendedor E tem itens PRÓPRIOS (não dropshipping)
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        items: {
          some: {
            product: {
              sellerId: seller.id
            },
            // ⚠️ Só permitir expedição de produtos PRÓPRIOS
            itemType: 'STOCK'
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ 
        error: 'Pedido não encontrado ou contém apenas produtos de dropshipping (expedidos pelo admin)' 
      }, { status: 404 })
    }

    // Marcar como separado
    await prisma.order.update({
      where: { id: params.id },
      data: {
        separatedAt: new Date(),
        status: 'PROCESSING'
      }
    })

    return NextResponse.json({ success: true, message: 'Pedido separado com sucesso' })
  } catch (error) {
    console.error('Erro ao separar pedido:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
