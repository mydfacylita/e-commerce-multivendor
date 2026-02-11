const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkFinancial() {
  try {
    // Vendedor MARCIOSTORE
    const sellerId = 'cmk4hal6j0009cxgjq662ziwc'
    
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
    
    console.log('\n=== SELLER ===')
    console.log('Nome:', seller.storeName)
    console.log('Balance:', seller.balance)
    console.log('Commission:', seller.commission)
    
    const activePlan = seller.subscriptions?.[0]?.plan
    console.log('\n=== PLANO ATIVO ===')
    console.log('Plano:', activePlan?.name)
    console.log('Comissão do Plano:', activePlan?.platformCommission)
    
    // Buscar itens de pedidos do vendedor
    const orderItems = await prisma.orderItem.findMany({
      where: {
        sellerId: sellerId,
        order: {
          status: { not: 'CANCELLED' }
        }
      },
      include: {
        order: {
          select: { id: true, status: true, createdAt: true }
        },
        product: {
          select: { id: true, name: true, supplierSku: true, costPrice: true }
        }
      }
    })
    
    console.log('\n=== ORDER ITEMS ===')
    console.log('Total de itens:', orderItems.length)
    
    let totalGross = 0
    let totalCommission = 0
    let totalRevenue = 0
    let dropCost = 0
    
    orderItems.forEach((item, i) => {
      const isDropshipping = !!item.product?.supplierSku
      const itemTotal = item.price * item.quantity
      
      console.log(`\n--- Item ${i + 1} ---`)
      console.log('Produto:', item.product?.name)
      console.log('É Dropshipping:', isDropshipping)
      console.log('Preço:', item.price, 'x', item.quantity, '=', itemTotal)
      console.log('commissionAmount (salvo):', item.commissionAmount)
      console.log('sellerRevenue (salvo):', item.sellerRevenue)
      console.log('costPrice do produto:', item.product?.costPrice)
      console.log('Status do pedido:', item.order?.status)
      
      totalGross += itemTotal
      totalCommission += item.commissionAmount || 0
      totalRevenue += item.sellerRevenue || 0
      
      if (isDropshipping && item.product?.costPrice) {
        dropCost += item.product.costPrice * item.quantity
      }
    })
    
    console.log('\n=== TOTAIS CALCULADOS ===')
    console.log('Total Bruto (vendas):', totalGross)
    console.log('Total Comissão:', totalCommission)
    console.log('Total Revenue (o que vendedor recebe):', totalRevenue)
    console.log('Custo Dropshipping:', dropCost)
    console.log('Balance do seller:', seller.balance)

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFinancial()
