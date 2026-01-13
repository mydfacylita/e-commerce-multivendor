import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { message: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    if (order.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    console.log('📦 [ORDER DETAILS] Dados do pedido:', {
      id: order.id,
      total: order.total,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      couponCode: order.couponCode,
      discountAmount: order.discountAmount,
      itemsCount: order.items?.length,
      items: order.items?.map(item => ({
        id: item.id,
        productName: item.product?.name,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        quantity: item.quantity,
        price: item.price
      }))
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar pedido' },
      { status: 500 }
    )
  }
}
