const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const order = await p.order.findFirst({
    where: { id: { startsWith: 'cmkmzxr4' } },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, price: true, costPrice: true }
          }
        }
      }
    }
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 PEDIDO:', order?.id);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Total:', order?.total);
  console.log('Subtotal:', order?.subtotal);
  console.log('Frete:', order?.shippingCost);
  console.log('Status:', order?.status);
  console.log('Data:', order?.createdAt);
  
  console.log('\n📋 ITENS DO PEDIDO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  order?.items.forEach((item, i) => {
    console.log(`\n${i + 1}. ${item.product?.name}`);
    console.log(`   Quantidade: ${item.quantity}`);
    console.log(`   Preço SALVO no pedido: R$ ${item.price}`);
    console.log(`   Preço ATUAL do produto: R$ ${item.product?.price}`);
    console.log(`   Custo do produto: R$ ${item.product?.costPrice}`);
  });

  await p.$disconnect();
}

main().catch(console.error);
