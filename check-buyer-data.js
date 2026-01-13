const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrders() {
  const orders = await prisma.order.findMany({
    where: { status: 'PENDING' },
    select: {
      id: true,
      buyerName: true,
      buyerEmail: true,
      buyerCpf: true,
      buyerPhone: true,
      total: true
    },
    take: 5
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 PEDIDOS PENDING - DADOS DO COMPRADOR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  for (const o of orders) {
    console.log(`Pedido: ${o.id.slice(0, 12)}...`);
    console.log(`  Nome: ${o.buyerName || '❌ VAZIO'}`);
    console.log(`  Email: ${o.buyerEmail || '❌ VAZIO'}`);
    console.log(`  CPF: ${o.buyerCpf || '❌ VAZIO'}`);
    console.log(`  Telefone: ${o.buyerPhone || '❌ VAZIO'}`);
    console.log(`  Total: R$ ${o.total}`);
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkOrders();
