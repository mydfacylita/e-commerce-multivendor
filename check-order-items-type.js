const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrderItems() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICANDO ITENS DE PEDIDOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Verificar itemTypes distintos
  const distinctTypes = await prisma.orderItem.groupBy({
    by: ['itemType'],
    _count: true
  });
  
  console.log('📊 Distribuição de itemType:');
  distinctTypes.forEach(t => console.log(`   ${t.itemType || 'NULL'}: ${t._count}`));
  console.log('');
  
  // Buscar itens que são DROPSHIPPING
  const nonStockItems = await prisma.orderItem.findMany({
    where: {
      itemType: 'DROPSHIPPING'
    },
    include: {
      order: {
        select: { id: true, status: true, createdAt: true }
      },
      product: {
        select: { id: true, name: true, isDropshipping: true }
      }
    },
    take: 20
  });
  
  console.log(`📋 Itens que NÃO são STOCK: ${nonStockItems.length}`);
  
  for (const item of nonStockItems) {
    console.log(`\n   Order: ${item.orderId.slice(0, 12)}...`);
    console.log(`   Product: ${item.product?.name?.slice(0, 30) || 'N/A'}`);
    console.log(`   itemType: ${item.itemType || 'NULL'}`);
    console.log(`   sellerId: ${item.sellerId || 'NULL'}`);
    console.log(`   isDropshipping (produto): ${item.product?.isDropshipping}`);
    console.log(`   Status: ${item.order.status}`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

checkOrderItems();
