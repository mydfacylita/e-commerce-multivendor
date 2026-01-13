const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPoltronaOrder() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICANDO PEDIDO POLTRONA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Buscar o item do pedido com Poltrona
  const item = await prisma.orderItem.findFirst({
    where: {
      product: {
        name: { contains: 'Poltrona' }
      }
    },
    include: {
      order: true,
      product: {
        include: {
          seller: true
        }
      }
    }
  });
  
  if (!item) {
    console.log('❌ Item não encontrado');
    return;
  }
  
  console.log('📦 ITEM DO PEDIDO:');
  console.log(`   ID: ${item.id}`);
  console.log(`   itemType: ${item.itemType}`);
  console.log(`   sellerId (item): ${item.sellerId}`);
  console.log(`   productId: ${item.productId}`);
  
  console.log('\n🛍️ PRODUTO:');
  console.log(`   ID: ${item.product.id}`);
  console.log(`   Nome: ${item.product.name}`);
  console.log(`   isDropshipping: ${item.product.isDropshipping}`);
  console.log(`   dropSourceUrl: ${item.product.dropSourceUrl || 'NULL'}`);
  console.log(`   aliExpressProductId: ${item.product.aliExpressProductId || 'NULL'}`);
  console.log(`   sellerId (produto): ${item.product.sellerId || 'NULL'}`);
  console.log(`   seller: ${item.product.seller?.storeName || item.product.seller?.nomeFantasia || 'NULL'}`);
  
  console.log('\n📋 PEDIDO:');
  console.log(`   ID: ${item.order.id}`);
  console.log(`   Status: ${item.order.status}`);
  console.log(`   Total: R$ ${item.order.total}`);
  console.log(`   userId: ${item.order.userId}`);
  console.log(`   parentOrderId: ${item.order.parentOrderId || 'NULL'}`);
  
  // Verificar se o vendedor "vê" este pedido
  const seller = await prisma.seller.findFirst({
    where: { id: item.sellerId }
  });
  
  console.log('\n👤 VENDEDOR DO ITEM:');
  if (seller) {
    console.log(`   ID: ${seller.id}`);
    console.log(`   Company: ${seller.companyName}`);
    console.log(`   userId: ${seller.userId}`);
  } else {
    console.log('   ❌ Vendedor não encontrado');
  }
  
  // Simular a query da página do vendedor
  console.log('\n📊 QUERY DO VENDEDOR (simulando página):');
  
  const vendorOrders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          sellerId: item.sellerId,
          itemType: 'STOCK'
        }
      }
    },
    include: {
      items: {
        where: { sellerId: item.sellerId, itemType: 'STOCK' }
      }
    }
  });
  
  console.log(`   Pedidos com STOCK: ${vendorOrders.length}`);
  
  const dropOrders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          sellerId: item.sellerId,
          itemType: 'DROPSHIPPING'
        }
      }
    },
    include: {
      items: {
        where: { sellerId: item.sellerId, itemType: 'DROPSHIPPING' }
      }
    }
  });
  
  console.log(`   Pedidos com DROPSHIPPING: ${dropOrders.length}`);
  
  // Mostra o pedido da Poltrona
  const poltronaInDrop = dropOrders.find(o => 
    o.items.some(i => i.productId === item.productId)
  );
  
  if (poltronaInDrop) {
    console.log('\n⚠️  PROBLEMA: Poltrona está aparecendo na lista DROPSHIPPING!');
    console.log(`   Order ID: ${poltronaInDrop.id}`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

checkPoltronaOrder();
