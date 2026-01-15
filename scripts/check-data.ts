import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  try {
    console.log('🔍 Verificando dados no banco...\n')

    const ordersCount = await prisma.order.count()
    const productsCount = await prisma.product.count()
    const customersCount = await prisma.user.count({ where: { role: 'USER' } })
    const orderItemsCount = await prisma.orderItem.count()

    console.log('📊 Contagem de registros:')
    console.log(`   Pedidos: ${ordersCount}`)
    console.log(`   Produtos: ${productsCount}`)
    console.log(`   Clientes: ${customersCount}`)
    console.log(`   Itens de pedidos: ${orderItemsCount}\n`)

    if (ordersCount > 0) {
      const recentOrders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true } } } }
        }
      })

      console.log('📦 Últimos 5 pedidos:')
      recentOrders.forEach(order => {
        console.log(`   ID: ${order.id} | Status: ${order.status} | Total: R$ ${order.total} | Cliente: ${order.user?.name || 'N/A'}`)
      })
    } else {
      console.log('⚠️  Nenhum pedido encontrado!')
      console.log('💡 Execute: npm run seed para popular dados de exemplo')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
