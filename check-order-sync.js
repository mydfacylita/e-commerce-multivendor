const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Buscar pedido 983029
  const order = await prisma.order.findFirst({
    where: { id: { endsWith: '983029' } },
    select: {
      id: true,
      status: true,
      supplierOrderId: true,
      trackingCode: true,
      updatedAt: true
    }
  })
  
  console.log('Pedido 983029:')
  console.log(JSON.stringify(order, null, 2))
  
  // Verificar quantos pedidos estão pendentes de sync
  const pendingOrders = await prisma.order.findMany({
    where: {
      supplierOrderId: { not: null },
      status: { notIn: ['DELIVERED', 'CANCELLED'] }
    },
    select: {
      id: true,
      status: true,
      supplierOrderId: true,
      trackingCode: true
    },
    take: 10
  })
  
  console.log('\nPedidos pendentes de sync:', pendingOrders.length)
  pendingOrders.forEach(o => {
    console.log(`  - ${o.id.slice(-6)}: ${o.status} | AE: ${o.supplierOrderId} | Track: ${o.trackingCode}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
