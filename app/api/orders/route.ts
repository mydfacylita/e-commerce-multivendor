import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateApiKey, validateUserToken } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  try {
    // 🔐 Validar API Key (obrigatório para app móvel)
    const apiKey = req.headers.get('x-api-key')
    if (apiKey) {
      const apiValidation = await validateApiKey(apiKey)
      if (!apiValidation.valid) {
        return NextResponse.json(
          { message: apiValidation.error || 'API Key inválida' },
          { status: 401 }
        )
      }
    }

    // 🔐 Tentar autenticação por JWT (app móvel) ou Session (web)
    let userId: string | null = null
    
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      // App móvel: usar JWT
      const tokenValidation = await validateUserToken(authHeader)
      if (!tokenValidation.valid) {
        return NextResponse.json(
          { message: tokenValidation.error || 'Token inválido' },
          { status: 401 }
        )
      }
      userId = tokenValidation.user?.userId || null
    } else {
      // Web: usar Session
      const session = await getServerSession(authOptions)
      userId = session?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json(
        { message: 'Não autorizado. Faça login para continuar.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { items, total, shippingAddress, buyerPhone, buyerCpf, couponCode, discountAmount, shippingCost, subtotal } = body

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 [CREATE ORDER] Dados recebidos:')
    console.log('   Total:', total)
    console.log('   Subtotal:', subtotal)
    console.log('   Frete:', shippingCost)
    console.log('   Cupom:', couponCode)
    console.log('   Desconto:', discountAmount)
    console.log('   Itens:', items?.length)
    items?.forEach((item: any, i: number) => {
      console.log(`   Item ${i + 1}:`, {
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor
      })
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Buscar nome e email do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })

    // Buscar informações dos produtos
    const productIds = items.map((item: any) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { 
        seller: {
          include: {
            subscription: {
              include: {
                plan: true
              }
            }
          }
        }
      },
    })

    // AGRUPAR ITENS POR DESTINO
    // REGRA CRÍTICA:
    // - DROPSHIPPING → Sempre ADM (são clones/integrações gerenciadas pela plataforma)
    // - ESTOQUE LOCAL do vendedor → Vendedor gerencia
    // - ESTOQUE LOCAL da plataforma → ADM gerencia
    const itemsByDestination: Map<string, any[]> = new Map()
    
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product) continue

      const itemTotal = item.price * item.quantity
      
      // ATENÇÃO: product.isDropshipping=1 apenas DISPONIBILIZA para dropshipping
      // Para SER DROP de verdade: isDropshipping=true E sellerId != null (vendedor vendendo)
      const sellerId = product.sellerId
      const isDropshipping = product.isDropshipping && sellerId !== null

      // DESTINO do pedido:
      // - Se é DROP (vendedor vendendo produto disponibilizado) → SELLER_{sellerId}
      // - Se é STOCK com vendedor → SELLER_{sellerId}
      // - Se não tem vendedor (próprio da ADM) → ADMIN
      let destination: string
      
      if (sellerId) {
        destination = `SELLER_${sellerId}` // Vendedor gerencia (DROP ou STOCK)
      } else {
        destination = 'ADMIN' // ADM gerencia (estoque próprio)
      }

      if (!itemsByDestination.has(destination)) {
        itemsByDestination.set(destination, [])
      }

      // Calcular comissões
      let commissionRate = 0
      let commissionAmount = 0
      let sellerRevenue = 0
      let supplierCost = null

      if (isDropshipping) {
        // DROP: vendedor tem DESCONTO de X% no preço base
        // Ex: Produto R$1,00 com 15% desconto = Vendedor paga R$0,85
        // Se vende por R$1,10, lucro = R$0,25
        const costPrice = product.costPrice || product.totalCost || 0
        commissionRate = product.dropshippingCommission || 0
        const discount = (costPrice * commissionRate) / 100
        const vendorCost = costPrice - discount // Custo do vendedor após desconto
        supplierCost = vendorCost
        sellerRevenue = (item.price * item.quantity) - (vendorCost * item.quantity) // Lucro = venda - custo
        commissionAmount = discount * item.quantity // Desconto total
      } else {
        // STOCK: vendedor paga taxa da plataforma definida no PLANO
        const planCommission = product.seller?.subscription?.plan?.platformCommission || product.seller?.commission || 10
        commissionRate = planCommission
        commissionAmount = (itemTotal * commissionRate) / 100
        sellerRevenue = itemTotal - commissionAmount
      }

      itemsByDestination.get(destination)!.push({
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

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🛒 PROCESSANDO PEDIDO')
    console.log(`📦 Destinos: ${itemsByDestination.size}`)
    for (const [dest, destItems] of itemsByDestination.entries()) {
      console.log(`   - ${dest}: ${destItems.length} item(s)`)
    }

    // CASO 1: Pedido SIMPLES (apenas 1 destino)
    if (itemsByDestination.size === 1) {
      console.log('✅ Pedido SIMPLES')
      
      const [[destination, orderItems]] = Array.from(itemsByDestination.entries())
      
      console.log('💾 [SALVANDO NO BANCO] Dados que SERÃO salvos:')
      console.log('   Total:', total)
      console.log('   Subtotal:', subtotal || total)
      console.log('   ShippingCost:', shippingCost || 0)
      console.log('   CouponCode:', couponCode || null)
      console.log('   DiscountAmount:', discountAmount || 0)
      console.log('   Items com size/color:', orderItems.map((i: any) => ({
        productId: i.productId,
        selectedSize: i.selectedSize,
        selectedColor: i.selectedColor
      })))
      
      const order = await prisma.order.create({
        data: {
          user: { connect: { id: userId } },
          total,
          subtotal: subtotal || total,
          shippingCost: shippingCost || 0,
          deliveryDays: body.deliveryDays || null,
          couponCode: couponCode || null,
          discountAmount: discountAmount || 0,
          shippingAddress,
          status: 'PENDING',
          buyerName: user?.name || '',
          buyerEmail: user?.email || '',
          buyerPhone: buyerPhone || '',
          buyerCpf: buyerCpf || '',
          items: {
            create: orderItems
          },
        },
        include: { items: true },
      })
      
      console.log('✅ [SALVO] Pedido criado:', order.id)
      console.log('   Subtotal salvo:', order.subtotal)
      console.log('   ShippingCost salvo:', order.shippingCost)
      console.log('   CouponCode salvo:', order.couponCode)
      console.log('   DiscountAmount salvo:', order.discountAmount)

      console.log(`   Pedido: ${order.id}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return NextResponse.json(
        { message: 'Pedido criado com sucesso', orderId: order.id },
        { status: 201 }
      )
    } 
    // CASO 2: Pedido HÍBRIDO (DROP + LOCAL ou ADM + SELLER)
    else {
      console.log('🔀 Pedido HÍBRIDO - Separando subpedidos')
      
      const createdOrders = []
      const parentOrderId = `HYB${Date.now().toString().slice(-10)}`

      for (const [destination, orderItems] of itemsByDestination.entries()) {
        const subTotal = orderItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        )
        
        const order = await prisma.order.create({
          data: {
            user: { connect: { id: userId } },
            parentOrderId,
            total: subTotal,
            subtotal: subTotal,
            shippingCost: (shippingCost || 0) / itemsByDestination.size, // Divide frete entre subpedidos
            deliveryDays: body.deliveryDays || null,
            couponCode: couponCode || null,
            discountAmount: (discountAmount || 0) / itemsByDestination.size, // Divide desconto proporcionalmente
            shippingAddress,
            status: 'PENDING',
            buyerName: user?.name || '',
            buyerEmail: user?.email || '',
            buyerPhone: buyerPhone || '',
            buyerCpf: buyerCpf || '',
            items: {
              create: orderItems
            },
          },
          include: { items: true },
        })

        createdOrders.push(order.id)
        console.log(`   └─ ${destination}: ${order.id} (R$ ${subTotal.toFixed(2)})`)
      }

      console.log(`✅ ${createdOrders.length} subpedidos criados`)
      console.log(`   ID Pai: ${parentOrderId}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return NextResponse.json(
        { 
          message: 'Pedido híbrido criado',
          orderId: parentOrderId,
          subOrders: createdOrders,
          isHybrid: true
        },
        { status: 201 }
      )
    }
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
      where: { userId: userId },
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
