import { prisma } from '../lib/prisma'

async function listRecentOrders() {
  console.log('📋 LISTANDO PEDIDOS RECENTES')
  console.log('='.repeat(80))
  
  const orders = await prisma.order.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      buyerName: true,
      buyerEmail: true,
      seller: {
        select: {
          id: true,
          storeName: true
        }
      },
      items: {
        select: {
          id: true,
          itemType: true,
          sellerId: true,
          sellerRevenue: true,
          supplierCost: true
        }
      }
    }
  })

  console.log(`\nTotal encontrado: ${orders.length} pedidos\n`)
  
  orders.forEach((order, index) => {
    console.log(`${index + 1}. Pedido #${order.id}`)
    console.log(`   Status: ${order.status}`)
    console.log(`   Total: R$ ${order.total.toFixed(2)}`)
    console.log(`   Data: ${order.createdAt.toLocaleString('pt-BR')}`)
    console.log(`   Cliente: ${order.buyerName || 'N/A'} (${order.buyerEmail || 'N/A'})`)
    if (order.seller) {
      console.log(`   Vendedor: ${order.seller.storeName} (ID: ${order.seller.id})`)
    }
    console.log(`   Itens: ${order.items.length}`)
    order.items.forEach(item => {
      console.log(`     - Tipo: ${item.itemType}, Seller ID: ${item.sellerId || 'N/A'}, Receita: R$ ${(item.sellerRevenue || 0).toFixed(2)}, Custo DROP: R$ ${(item.supplierCost || 0).toFixed(2)}`)
    })
    console.log('')
  })
}

listRecentOrders()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
