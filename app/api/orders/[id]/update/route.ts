import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/orders/[id]/update
 * Atualiza um pedido PENDING com novos itens/endereço
 * Usado quando cliente volta no checkout para alterar algo
 */
export async function PUT(
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

    const orderId = params.id

    // Buscar pedido existente
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { message: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o pedido pertence ao usuário
    if (existingOrder.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Só pode atualizar pedidos PENDING
    if (existingOrder.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'Apenas pedidos pendentes podem ser atualizados' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { 
      items, 
      total, 
      shippingAddress, 
      buyerPhone, 
      buyerCpf, 
      couponCode, 
      discountAmount, 
      shippingCost, 
      subtotal, 
      deliveryDays,
      // Campos de transportadora
      shippingMethod,
      shippingService,
      shippingCarrier
    } = body

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 [UPDATE ORDER] Atualizando pedido:', orderId)
    console.log('   Total:', total)
    console.log('   Subtotal:', subtotal)
    console.log('   Frete:', shippingCost)
    console.log('   Método Envio:', shippingMethod)
    console.log('   Serviço:', shippingService)
    console.log('   Transportadora:', shippingCarrier)
    console.log('   Itens:', items?.length)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Se não tem itens no carrinho, apenas manter o pedido como está
    // (será cancelado automaticamente após 7 dias)
    if (!items || items.length === 0) {
      console.log('⚠️ Carrinho vazio - mantendo pedido para cancelamento automático')
      return NextResponse.json(
        { message: 'Carrinho vazio - pedido será cancelado automaticamente se não for pago', orderId },
        { status: 200 }
      )
    }

    // Buscar informações dos produtos
    const productIds = items.map((item: any) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { 
        seller: {
          include: {
            subscriptions: {
              where: { status: { in: ['ACTIVE', 'TRIAL'] } },
              include: { plan: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      },
    })

    // Preparar novos itens com comissões calculadas
    const newOrderItems: any[] = []
    
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product) continue

      const itemTotal = item.price * item.quantity
      const sellerId = product.sellerId
      const isDropshipping = product.isDropshipping && sellerId !== null

      let commissionRate = 0
      let commissionAmount = 0
      let sellerRevenue = 0
      let supplierCost = null

      if (isDropshipping) {
        const costPrice = product.costPrice || product.totalCost || 0
        commissionRate = product.dropshippingCommission || 0
        const discount = (costPrice * commissionRate) / 100
        const vendorCost = costPrice - discount
        supplierCost = vendorCost
        sellerRevenue = (item.price * item.quantity) - (vendorCost * item.quantity)
        commissionAmount = discount * item.quantity
      } else {
        const activeSubscription = product.seller?.subscriptions?.[0]
        const planCommission = activeSubscription?.plan?.platformCommission || product.seller?.commission || 10
        commissionRate = planCommission
        commissionAmount = (itemTotal * commissionRate) / 100
        sellerRevenue = itemTotal - commissionAmount
      }

      newOrderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        selectedSize: item.selectedSize || null,
        selectedColor: item.selectedColor || null,
        itemType: isDropshipping ? 'DROPSHIPPING' : 'STOCK',
        sellerId: sellerId || null,
        commissionRate,
        commissionAmount,
        sellerRevenue,
        supplierCost: isDropshipping ? supplierCost : null,
      })
    }

    // Atualizar pedido em uma transação
    await prisma.$transaction(async (tx) => {
      // Deletar itens antigos
      await tx.orderItem.deleteMany({
        where: { orderId }
      })

      // Atualizar pedido com novos dados
      await tx.order.update({
        where: { id: orderId },
        data: {
          total,
          subtotal: subtotal || total,
          shippingCost: shippingCost || 0,
          deliveryDays: deliveryDays || null,
          couponCode: couponCode || null,
          discountAmount: discountAmount || 0,
          shippingAddress,
          buyerPhone: buyerPhone || existingOrder.buyerPhone,
          buyerCpf: buyerCpf || existingOrder.buyerCpf,
          // Campos de transportadora
          shippingMethod: shippingMethod || null,
          shippingService: shippingService || null,
          shippingCarrier: shippingCarrier || null,
          // Limpar dados de pagamento antigos para permitir nova tentativa
          paymentId: null,
          paymentStatus: null,
          updatedAt: new Date()
        }
      })

      // Criar novos itens
      for (const item of newOrderItems) {
        await tx.orderItem.create({
          data: {
            orderId,
            ...item
          }
        })
      }
    })

    console.log('✅ Pedido atualizado com sucesso:', orderId)

    return NextResponse.json(
      { message: 'Pedido atualizado com sucesso', orderId },
      { status: 200 }
    )

  } catch (error) {
    console.error('Erro ao atualizar pedido:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar pedido' },
      { status: 500 }
    )
  }
}
