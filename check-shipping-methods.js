const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Ver pedidos SHIPPED
  const shipped = await prisma.order.findMany({
    where: { status: 'SHIPPED' },
    select: {
      id: true,
      status: true,
      shippingMethod: true,
      shippingCarrier: true,
      shippingService: true,
      buyerName: true
    },
    take: 20
  })
  
  console.log('Pedidos SHIPPED:')
  shipped.forEach(o => {
    console.log(`  ${o.id.slice(-6)} | Method: ${o.shippingMethod} | Carrier: ${o.shippingCarrier} | Service: ${o.shippingService}`)
  })
  
  // Ver todos os valores únicos de shippingMethod
  const methods = await prisma.order.groupBy({
    by: ['shippingMethod'],
    _count: true
  })
  
  console.log('\nMétodos de envio:')
  methods.forEach(m => {
    console.log(`  ${m.shippingMethod}: ${m._count} pedidos`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
