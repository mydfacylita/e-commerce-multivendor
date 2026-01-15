import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Webhook do Mercado Livre para receber notificações de vendas
 * 
 * Documentação: https://developers.mercadolivre.com.br/pt_br/notificacoes
 * 
 * Tipos de notificações:
 * - orders_v2: Pedido criado ou atualizado
 * - items: Item criado ou atualizado
 * - questions: Pergunta recebida
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    console.log('Webhook ML recebido:', JSON.stringify(body, null, 2))

    // Validar estrutura da notificação
    if (!body.topic || !body.resource) {
      console.error('Webhook inválido:', body)
      return NextResponse.json({ message: 'Invalid webhook' }, { status: 400 })
    }

    // Processar apenas notificações de pedidos
    if (body.topic === 'orders_v2') {
      await processOrderNotification(body)
    }

    // Sempre retornar 200 OK para o ML
    return NextResponse.json({ message: 'Webhook received' })
  } catch (error) {
    console.error('Erro no webhook ML:', error)
    // Mesmo com erro, retornar 200 para não receber reenvios
    return NextResponse.json({ message: 'Error processed' })
  }
}

/**
 * Processar notificação de pedido do ML
 */
async function processOrderNotification(notification: any) {
  try {
    const orderId = notification.resource.split('/').pop()
    
    console.log(`Processando pedido ML: ${orderId}`)

    // Buscar token do ML do admin
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { mercadoLivreAuth: true },
    })

    if (!adminUser?.mercadoLivreAuth) {
      console.error('Autenticação ML não encontrada')
      return
    }

    const mlAuth = adminUser.mercadoLivreAuth

    // Verificar se token expirou
    if (mlAuth.expiresAt < new Date()) {
      console.error('Token ML expirado')
      return
    }

    // Buscar detalhes do pedido no ML
    const orderResponse = await fetch(
      `https://api.mercadolibre.com/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${mlAuth.accessToken}`,
        },
      }
    )

    if (!orderResponse.ok) {
      console.error('Erro ao buscar pedido ML:', await orderResponse.text())
      return
    }

    const mlOrder = await orderResponse.json()

    console.log('Pedido ML obtido:', JSON.stringify(mlOrder, null, 2))

    // Verificar se o pedido já existe no sistema
    const existingOrder = await prisma.order.findUnique({
      where: { marketplaceOrderId: orderId },
    })

    if (existingOrder) {
      console.log(`Pedido ${orderId} já existe no sistema`)
      return
    }

    // Criar pedido no sistema local
    await createLocalOrder(mlOrder, adminUser.id)
  } catch (error) {
    console.error('Erro ao processar pedido ML:', error)
  }
}

/**
 * Criar pedido local a partir do pedido do ML
 */
async function createLocalOrder(mlOrder: any, adminUserId: string) {
  try {
    // Calcular total e lucro
    let total = mlOrder.total_amount
    let profit = 0

    // Processar itens do pedido
    const orderItems = []

    for (const mlItem of mlOrder.order_items) {
      // Buscar produto no sistema local pelo ID do ML
      const product = await prisma.product.findFirst({
        where: {
          // Assumindo que você salvou o ML item_id em algum campo
          name: { contains: mlItem.item.title },
        },
        include: { 
          supplier: true,
          seller: true,
        },
      })

      if (product) {
        const itemProfit =
          (product.price - (product.costPrice || 0)) * mlItem.quantity
        profit += itemProfit

        const itemTotal = mlItem.unit_price * mlItem.quantity
        const isDropshipping = !!product.supplierSku
        
        let commissionRate = 0
        let commissionAmount = 0
        let sellerRevenue = 0

        if (isDropshipping && product.supplierSku) {
          // Buscar comissão do produto ORIGINAL
          const originalProduct = await prisma.product.findUnique({
            where: { id: product.supplierSku },
            select: { dropshippingCommission: true }
          })
          
          commissionRate = originalProduct?.dropshippingCommission || 0
          commissionAmount = (itemTotal * commissionRate) / 100
          const costBase = (product.costPrice || 0) * mlItem.quantity
          sellerRevenue = (itemTotal - costBase) + commissionAmount
        } else {
          // Produto próprio: vendedor PAGA comissão
          commissionRate = product.seller?.commission || 0
          commissionAmount = (itemTotal * commissionRate) / 100
          sellerRevenue = itemTotal - commissionAmount
        }

        orderItems.push({
          productId: product.id,
          quantity: mlItem.quantity,
          price: mlItem.unit_price,
          sellerId: product.sellerId,
          commissionRate,
          commissionAmount,
          sellerRevenue,
        })
      }
    }

    // Montar endereço de envio
    const shipping = mlOrder.shipping
    const shippingAddress = `${shipping.receiver_address.street_name} ${shipping.receiver_address.street_number}, ${shipping.receiver_address.city.name}, ${shipping.receiver_address.state.name}, ${shipping.receiver_address.zip_code}`

    // Criar pedido
    const order = await prisma.order.create({
      data: {
        userId: adminUserId,
        status: 'PENDING',
        total,
        profit,
        shippingAddress,
        marketplaceName: 'Mercado Livre',
        marketplaceOrderId: mlOrder.id.toString(),
        sentToSupplier: false,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    console.log(`Pedido criado no sistema: ${order.id}`)
    
    // TODO: Enviar notificação ao admin (email, push, etc.)
    
  } catch (error) {
    console.error('Erro ao criar pedido local:', error)
    throw error
  }
}

/**
 * GET para verificar se webhook está funcionando
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook Mercado Livre ativo',
    timestamp: new Date().toISOString(),
  })
}
