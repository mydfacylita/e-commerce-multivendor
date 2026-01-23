const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 AUDITORIA DE PREÇOS - ITENS COM DIVERGÊNCIA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Buscar itens de pedidos com JOIN em produto
  const orderItems = await p.orderItem.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: { id: true, name: true, price: true, costPrice: true }
      },
      order: {
        select: { id: true, createdAt: true, total: true, subtotal: true }
      }
    }
  });
  
  let divergencias = 0;
  
  for (const item of orderItems) {
    const precoItem = item.price;
    const precoProduto = item.product?.price || 0;
    const diferenca = Math.abs(precoItem - precoProduto);
    
    // Se diferença maior que 1 centavo, mostrar
    if (diferenca > 0.01) {
      divergencias++;
      console.log(`❌ DIVERGÊNCIA ENCONTRADA:`);
      console.log(`   Pedido: ${item.order.id}`);
      console.log(`   Data: ${item.order.createdAt}`);
      console.log(`   Produto: ${item.product?.name}`);
      console.log(`   💰 Preço SALVO no item: R$ ${precoItem.toFixed(2)}`);
      console.log(`   📦 Preço ATUAL produto: R$ ${precoProduto.toFixed(2)}`);
      console.log(`   📊 Diferença: R$ ${diferenca.toFixed(2)}`);
      console.log(`   Custo: R$ ${item.product?.costPrice || 0}`);
      console.log('');
    }
  }
  
  if (divergencias === 0) {
    console.log('✅ Nenhuma divergência de preços encontrada nos últimos 20 pedidos.');
  } else {
    console.log(`\n⚠️ Total de divergências: ${divergencias}`);
  }
  
  await p.$disconnect();
}

main().catch(console.error);
