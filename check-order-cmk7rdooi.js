const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 ANALISANDO PEDIDO cmk7rdooi000t27y59pquq4ko');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Buscar o pedido
  const order = await prisma.order.findUnique({
    where: { id: 'cmk7rdooi000t27y59pquq4ko' },
    include: {
      items: {
        include: {
          product: {
            include: {
              seller: true
            }
          }
        }
      },
      user: {
        select: { name: true, email: true }
      }
    }
  });
  
  if (!order) {
    console.log('❌ Pedido não encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log('📋 PEDIDO:');
  console.log(`   ID: ${order.id}`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Total: R$ ${order.total}`);
  console.log(`   Comprador: ${order.user?.name || order.buyerName}`);
  console.log(`   Data: ${order.createdAt}`);
  
  console.log('\n📦 ITENS DO PEDIDO:');
  for (const item of order.items) {
    console.log(`\n   --- Item ---`);
    console.log(`   Item ID: ${item.id}`);
    console.log(`   itemType: ${item.itemType}`);
    console.log(`   sellerId (item): ${item.sellerId || 'NULL'}`);
    console.log(`   productId: ${item.productId}`);
    console.log(`   Qtd: ${item.quantity}`);
    console.log(`   Preço: R$ ${item.price}`);
    
    console.log(`\n   🛍️ PRODUTO:`);
    console.log(`   ID: ${item.product.id}`);
    console.log(`   Nome: ${item.product.name}`);
    console.log(`   isDropshipping: ${item.product.isDropshipping}`);
    console.log(`   availableForDropship: ${item.product.availableForDropship}`);
    console.log(`   active: ${item.product.active}`);
    console.log(`   sellerId (produto): ${item.product.sellerId || 'NULL'}`);
    
    if (item.product.seller) {
      console.log(`\n   👤 VENDEDOR DO PRODUTO:`);
      console.log(`   ID: ${item.product.seller.id}`);
      console.log(`   Store: ${item.product.seller.storeName || item.product.seller.nomeFantasia}`);
      console.log(`   Status: ${item.product.seller.status}`);
    }
  }
  
  // Verificar produtos dropshipping ativos na lista do vendedor
  const sellerId = order.items[0]?.sellerId;
  if (sellerId) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 PRODUTOS DROP DO VENDEDOR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const vendorProducts = await prisma.product.findMany({
      where: { 
        sellerId: sellerId,
        isDropshipping: true
      },
      select: {
        id: true,
        name: true,
        isDropshipping: true,
        availableForDropship: true,
        active: true,
        price: true
      }
    });
    
    console.log(`📦 Produtos DROP do vendedor: ${vendorProducts.length}`);
    for (const p of vendorProducts) {
      console.log(`\n   - ${p.name}`);
      console.log(`     ID: ${p.id}`);
      console.log(`     isDropshipping: ${p.isDropshipping}`);
      console.log(`     availableForDropship: ${p.availableForDropship}`);
      console.log(`     active: ${p.active}`);
      console.log(`     price: R$ ${p.price}`);
    }
  }
  
  // Todas as Camisetas no sistema
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TODAS AS CAMISETAS NO SISTEMA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const allCamisetas = await prisma.product.findMany({
    where: {
      name: { contains: 'Camiseta' }
    },
    select: {
      id: true,
      name: true,
      sellerId: true,
      isDropshipping: true,
      availableForDropship: true,
      active: true,
      price: true
    }
  });
  
  console.log(`Total: ${allCamisetas.length}`);
  for (const p of allCamisetas) {
    const tipo = p.sellerId ? `VENDEDOR (${p.sellerId.slice(0,8)}...)` : 'ADM';
    console.log(`\n   - ${p.name} [${tipo}]`);
    console.log(`     ID: ${p.id}`);
    console.log(`     isDropshipping: ${p.isDropshipping}`);
    console.log(`     availableForDropship: ${p.availableForDropship}`);
    console.log(`     active: ${p.active}`);
    console.log(`     price: R$ ${p.price}`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

checkOrder();
