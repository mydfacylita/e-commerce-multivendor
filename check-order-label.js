const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  const order = await p.order.findUnique({
    where: { id: 'cmklcf6de00001v8dvot4z9jq' },
    select: {
      id: true,
      shippingMethod: true,
      shippingService: true,
      shippingCarrier: true,
      trackingCode: true,
      buyerName: true
    }
  })
  console.log('Pedido:', JSON.stringify(order, null, 2))
  await p.$disconnect()
}

check()
