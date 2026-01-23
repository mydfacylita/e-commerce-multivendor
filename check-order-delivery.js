const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const orders = await p.order.findMany({
    where: { marketplaceName: 'APP' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      deliveryDays: true,
      shippingMethod: true,
      shippingCarrier: true,
      marketplaceName: true,
      createdAt: true
    }
  });
  console.log('Últimos 5 pedidos do APP:');
  orders.forEach(o => console.log(o));
}

main().finally(() => p.$disconnect());
