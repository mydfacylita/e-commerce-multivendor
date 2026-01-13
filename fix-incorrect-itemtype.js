const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixIncorrectDropshippingItems() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 CORRIGINDO ITENS COM itemType INCORRETO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Buscar itens que estão marcados como DROPSHIPPING
  // mas o produto NÃO é dropshipping
  const incorrectItems = await prisma.orderItem.findMany({
    where: {
      itemType: 'DROPSHIPPING',
      product: {
        isDropshipping: false
      }
    },
    include: {
      product: {
        select: { id: true, name: true, isDropshipping: true }
      },
      order: {
        select: { id: true, status: true }
      }
    }
  });
  
  console.log(`❌ Encontrados ${incorrectItems.length} item(s) incorretos\n`);
  
  if (incorrectItems.length === 0) {
    console.log('✅ Nenhum item para corrigir!');
    await prisma.$disconnect();
    return;
  }
  
  // Mostrar os itens que serão corrigidos
  console.log('📋 Itens que serão corrigidos:');
  for (const item of incorrectItems) {
    console.log(`   - Order: ${item.orderId.slice(0, 12)}...`);
    console.log(`     Product: ${item.product.name}`);
    console.log(`     Product.isDropshipping: ${item.product.isDropshipping}`);
    console.log(`     Atual itemType: ${item.itemType}`);
    console.log(`     Novo itemType: STOCK`);
    console.log('');
  }
  
  // Corrigir os itens
  const result = await prisma.orderItem.updateMany({
    where: {
      itemType: 'DROPSHIPPING',
      product: {
        isDropshipping: false
      }
    },
    data: {
      itemType: 'STOCK'
    }
  });
  
  console.log(`✅ ${result.count} item(s) corrigido(s)!\n`);
  
  // Verificar após correção
  const remainingIncorrect = await prisma.orderItem.count({
    where: {
      itemType: 'DROPSHIPPING',
      product: {
        isDropshipping: false
      }
    }
  });
  
  console.log(`📊 Itens incorretos restantes: ${remainingIncorrect}`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

fixIncorrectDropshippingItems();
