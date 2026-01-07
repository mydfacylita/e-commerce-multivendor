import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { items, total, shippingAddress, buyerPhone, buyerCpf } = await req.json()

    // Buscar nome e email do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    })

    // Buscar informações dos produtos para pegar sellerId e calcular comissão
    const productIds = items.map((item: any) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { seller: true },
    })

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total,
        shippingAddress,
        status: 'PENDING',
        buyerName: user?.name || '',
        buyerEmail: user?.email || '',
        buyerPhone: buyerPhone || '',
        buyerCpf: buyerCpf || '',
        items: {
          create: await Promise.all(items.map(async (item: any) => {
            const product = products.find((p) => p.id === item.productId)
            const itemTotal = item.price * item.quantity
            const isDropshipping = !!product?.supplierSku
            
            let commissionRate = 0
            let commissionAmount = 0
            let sellerRevenue = 0

            if (isDropshipping) {
              // Buscar comissão do produto ORIGINAL (não da cópia)
              const originalProduct = await prisma.product.findUnique({
                where: { id: product.supplierSku },
                select: { dropshippingCommission: true }
              })
              
              commissionRate = originalProduct?.dropshippingCommission || 0
              commissionAmount = (itemTotal * commissionRate) / 100
              const costBase = (product?.costPrice || 0) * item.quantity
              sellerRevenue = (itemTotal - costBase) + commissionAmount
            } else {
              // Produto próprio: vendedor PAGA comissão
              commissionRate = product?.seller?.commission || 0
              commissionAmount = (itemTotal * commissionRate) / 100
              sellerRevenue = itemTotal - commissionAmount
            }

            return {
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              sellerId: product?.sellerId || null,
              commissionRate,
              commissionAmount,
              sellerRevenue,
            }
          })),
        },
      },
      include: { items: true },
    })

    return NextResponse.json(
      { message: 'Pedido criado com sucesso', orderId: order.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return NextResponse.json(
      { message: 'Erro ao criar pedido' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar pedidos' },
      { status: 500 }
    )
  }
}
