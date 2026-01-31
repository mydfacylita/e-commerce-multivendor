const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Buscar últimos 10 pedidos com items
    const allOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                isDropshipping: true,
                supplierId: true
              }
            }
          }
        }
      }
    });

    console.log('Últimos 10 pedidos:\n');
    for (const order of allOrders) {
      console.log(`Pedido: ${order.id.substring(0, 12).toUpperCase()}`);
      console.log(`  Data: ${order.createdAt}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Items:`);
      for (const item of order.items) {
        console.log(`    - ${item.product.name}`);
        console.log(`      isDropshipping: ${item.product.isDropshipping}`);
        console.log(`      supplierId: ${item.product.supplierId || 'N/A'}`);
      }
      console.log('---');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Erro:', error);
    await prisma.$disconnect();
  }
}

check();
