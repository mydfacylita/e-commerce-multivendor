const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkOrders() {
  try {
    // Buscar pedidos do vendedor MARCIOSTORE
    const seller = await prisma.seller.findFirst({
      where: {
        storeName: 'MARCIOSTORE'
      }
    })

    if (!seller) {
      console.log('❌ Vendedor não encontrado')
      return
    }

    console.log('🏪 Vendedor:', seller.storeName, '- ID:', seller.id)
    console.log('')

    // Buscar TODOS os pedidos com items deste vendedor
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            sellerId: seller.id
          }
        }
      },
      include: {
        items: {
          where: {
            sellerId: seller.id
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    console.log(`📦 ${orders.length} pedidos encontrados:\n`)

    for (const order of orders) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`Pedido: ${order.id}`)
      console.log(`Status: ${order.status}`)
      console.log(`Total: R$ ${order.total}`)
      console.log(`Items do vendedor:`)
      
      for (const item of order.items) {
        console.log(`   - Item ID: ${item.id}`)
        console.log(`     Produto: ${item.productId}`)
        console.log(`     Tipo: ${item.itemType}`)
        console.log(`     Seller ID: ${item.sellerId}`)
        console.log(`     Qtd: ${item.quantity} x R$ ${item.price}`)
      }
      console.log('')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkOrders()
