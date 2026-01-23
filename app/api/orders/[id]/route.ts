import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Tenta autenticação via NextAuth (sessão web)
    const session = await getServerSession(authOptions)
    let userId: string | null = session?.user?.id || null
    let userRole: string | null = session?.user?.role || null
    
    // Se não tem sessão, tenta autenticação via JWT (app mobile)
    if (!userId) {
      const authHeader = req.headers.get('authorization')
      console.log('🔑 [ORDER DETAILS] Authorization header:', authHeader ? 'Presente' : 'Ausente')
      
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; role?: string }
          userId = decoded.sub
          userRole = decoded.role || null
          console.log('📱 [ORDER DETAILS] Autenticação JWT:', { userId, userRole, tokenPayload: decoded })
        } catch (jwtError) {
          console.error('❌ [ORDER DETAILS] JWT inválido:', jwtError)
        }
      }
    }

    if (!userId) {
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
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            accessKey: true,
            pdfUrl: true,
            xmlUrl: true,
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

    console.log('🔍 [ORDER DETAILS] Verificação de permissão:', {
      orderUserId: order.userId,
      requestUserId: userId,
      userRole,
      match: order.userId === userId
    })

    if (order.userId !== userId && userRole !== 'ADMIN') {
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
      paymentMethod: order.paymentMethod,
      paymentType: order.paymentType,
      deliveryDays: order.deliveryDays,
      shippingMethod: order.shippingMethod,
      shippingCarrier: order.shippingCarrier,
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
