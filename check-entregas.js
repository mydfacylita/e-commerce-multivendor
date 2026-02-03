const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Ver pedidos SHIPPED com entrega própria
  const shipped = await prisma.order.findMany({
    where: { 
      status: 'SHIPPED',
      shippingMethod: 'propria'
    },
    select: {
      id: true,
      status: true,
      shippingMethod: true,
      deliveredAt: true,
      deliveryAttempts: true,
      buyerName: true
    }
  })
  
  console.log('Pedidos SHIPPED + propria:')
  console.log(JSON.stringify(shipped, null, 2))
  console.log(`\nTotal: ${shipped.length}`)
  
  // Testar query exata
  const result = await prisma.order.count({
    where: {
      status: 'SHIPPED',
      shippingMethod: 'propria',
      deliveredAt: null
    }
  })
  console.log(`\nQuery exata (status=SHIPPED, method=propria, deliveredAt=null): ${result}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
