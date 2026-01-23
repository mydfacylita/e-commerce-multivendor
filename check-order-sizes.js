const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Buscar últimos 3 pedidos
  const orders = await p.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { 
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          price: true,
          selectedSize: true,
          selectedColor: true
        }
      }
    }
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 ÚLTIMOS PEDIDOS - VERIFICAÇÃO DE TAMANHO/COR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Coletar productIds
  const productIds = [];
  
  for (const order of orders) {
    console.log(`📋 Pedido: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Data: ${order.createdAt}`);
    console.log(`   Total: R$ ${order.total}`);
    console.log(`   Itens:`);
    
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      productIds.push(item.productId);
      console.log(`     ${i+1}. Product: ${item.productId.substring(0, 12)}...`);
      console.log(`        Qtd: ${item.quantity} | Preço: R$ ${item.price}`);
      console.log(`        📐 Tamanho: ${item.selectedSize || '❌ NULL'}`);
      console.log(`        🎨 Cor: ${item.selectedColor || '❌ NULL'}`);
    }
    console.log('');
  }
  
  // Verificar se produtos tem sizes/colors
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏷️ PRODUTOS - TAMANHOS/CORES CADASTRADOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const products = await p.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sizes: true, colors: true }
  });
  
  for (const prod of products) {
    console.log(`📦 ${prod.name}`);
    console.log(`   ID: ${prod.id}`);
    console.log(`   Sizes: ${prod.sizes || '❌ NULL'}`);
    console.log(`   Colors: ${prod.colors || '❌ NULL'}`);
    console.log('');
  }
  
  await p.$disconnect();
}

main().catch(console.error);
