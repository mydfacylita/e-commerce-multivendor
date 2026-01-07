const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkOrder() {
  const order = await prisma.order.findUnique({
    where: { marketplaceOrderId: '2000014597259384' },
    select: {
      buyerMessages: true,
      buyerCpf: true,
      buyerPhone: true,
      buyerName: true,
      shippingAddress: true
    }
  })
  
  console.log('=== DADOS DO PEDIDO NO BANCO ===')
  console.log(JSON.stringify(order, null, 2))
  
  await prisma.$disconnect()
}

checkOrder()
