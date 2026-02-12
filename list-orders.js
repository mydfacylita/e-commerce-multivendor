const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listOrders() {
  const orders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      total: true,
      affiliateCode: true,
      affiliateId: true,
      buyerName: true,
      createdAt: true
    }
  });

  console.log('\n📦 ÚLTIMOS 5 PEDIDOS:\n');
  console.log('='.repeat(100));
  
  orders.forEach(o => {
    console.log(`ID: ${o.id}`);
    console.log(`   Cliente: ${o.buyerName || 'N/A'}`);
    console.log(`   Status: ${o.status} | Valor: R$ ${Number(o.total).toFixed(2)}`);
    console.log(`   Afiliado: ${o.affiliateCode || 'NENHUM'} ${o.affiliateId ? `(ID: ${o.affiliateId.substring(0,10)}...)` : ''}`);
    console.log(`   Criado: ${o.createdAt.toLocaleString('pt-BR')}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

listOrders().catch(console.error);
