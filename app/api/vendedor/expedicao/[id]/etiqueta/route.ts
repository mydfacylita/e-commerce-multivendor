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
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // TODO: Integrar com Correios/Melhor Envio para gerar etiqueta real
    // Por enquanto, apenas atualiza o status

    // Se já tem etiqueta, retornar
    if (order.shippingLabelUrl) {
      return NextResponse.json({ 
        success: true, 
        labelUrl: order.shippingLabelUrl,
        message: 'Etiqueta já gerada anteriormente'
      })
    }

    // Simular geração de código de rastreio
    const trackingCode = `BR${Date.now().toString().slice(-10)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`

    // Atualizar pedido com código de rastreio
    await prisma.order.update({
      where: { id: params.id },
      data: {
        trackingCode
      }
    })

    return NextResponse.json({ 
      success: true, 
      trackingCode,
      message: 'Código de rastreio gerado. Para etiqueta completa, configure a integração com Correios.'
    })
  } catch (error) {
    console.error('Erro ao gerar etiqueta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(
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
      },
      select: {
        id: true,
        trackingCode: true,
        shippingLabelUrl: true,
        shippingLabelCost: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Erro ao buscar etiqueta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
