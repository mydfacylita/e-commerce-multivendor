const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Buscar pedido pelo orderNumber 450437
  const orders = await p.order.findMany({
    where: {
      orderNumber: 450437
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              isDropshipping: true,
              supplierId: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('=== PEDIDO #450437 ===\n');
  
  if (orders.length === 0) {
    console.log('Pedido não encontrado com orderNumber 450437');
    
    // Tentar buscar pedidos recentes
    const recent = await p.order.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, createdAt: true }
    });
    console.log('\nPedidos recentes:');
    recent.forEach(o => console.log(`  ${o.orderNumber} - ${o.id} - ${o.createdAt}`));
  } else {
    for (const order of orders) {
      console.log(`ID: ${order.id}`);
      console.log(`OrderNumber: ${order.orderNumber}`);
      console.log(`Status: ${order.status}`);
      console.log(`PaymentStatus: ${order.paymentStatus}`);
      console.log(`Items: ${order.items.length}`);
      
      for (const item of order.items) {
        console.log(`\n  - ${item.product.name.substring(0, 50)}...`);
        console.log(`    isDropshipping: ${item.product.isDropshipping}`);
        console.log(`    supplierId: ${item.product.supplierId}`);
        if (item.product.supplier) {
          console.log(`    supplier: ${item.product.supplier.name} (type: ${item.product.supplier.type})`);
        } else {
          console.log(`    supplier: null`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
