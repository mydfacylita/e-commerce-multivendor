const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    // Simular a lógica da API orders-for-refund
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: { in: ['approved', 'partial_refunded'] },
        paymentId: { not: null }
      },
      select: {
        id: true,
        parentOrderId: true,
        paymentId: true,
        paymentStatus: true,
        total: true,
        buyerName: true,
        items: {
          select: {
            id: true,
            itemType: true,
            price: true,
            quantity: true,
            product: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    console.log('=== AGRUPAMENTO DE PEDIDOS ===\n')
    console.log(`Total de registros: ${orders.length}\n`)
    
    // Agrupar pedidos híbridos
    const groupedOrders = new Map()
    
    for (const order of orders) {
      if (order.parentOrderId) {
        // Pedido híbrido
        const key = order.parentOrderId
        if (groupedOrders.has(key)) {
          const existing = groupedOrders.get(key)
          existing.subOrderIds.push(order.id)
          existing.combinedTotal += order.total
          existing.combinedItems.push(...order.items)
        } else {
          groupedOrders.set(key, {
            ...order,
            id: order.parentOrderId,
            isHybrid: true,
            subOrderIds: [order.id],
            combinedTotal: order.total,
            combinedItems: [...order.items]
          })
        }
      } else {
        // Pedido simples
        groupedOrders.set(order.id, {
          ...order,
          isHybrid: false,
          subOrderIds: [order.id],
          combinedTotal: order.total,
          combinedItems: [...order.items]
        })
      }
    }
    
    console.log(`Total após agrupamento: ${groupedOrders.size}\n`)
    
    for (const [key, order] of groupedOrders.entries()) {
      console.log(`📦 ${order.isHybrid ? '[HÍBRIDO]' : '[SIMPLES]'} ${key.slice(0, 15)}...`)
      console.log(`   Cliente: ${order.buyerName || 'N/A'}`)
      console.log(`   PaymentId: ${order.paymentId}`)
      console.log(`   Total: R$ ${(order.isHybrid ? order.combinedTotal : order.total).toFixed(2)}`)
      console.log(`   Sub-pedidos: ${order.subOrderIds.length}`)
      console.log(`   Itens: ${order.isHybrid ? order.combinedItems.length : order.items.length}`)
      
      const items = order.isHybrid ? order.combinedItems : order.items
      items.forEach((item, i) => {
        console.log(`      ${i+1}. [${item.itemType || 'STOCK'}] ${item.product?.name || 'N/A'} - R$ ${(item.price * item.quantity).toFixed(2)}`)
      })
      console.log('')
    }
    
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
