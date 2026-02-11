const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const seller = await prisma.seller.findFirst({
    where: { storeName: 'MARCIOSTORE' }
  });
  
  // Por status de pagamento
  const orders = await prisma.order.findMany({
    where: { items: { some: { sellerId: seller.id } } },
    select: {
      id: true,
      paymentStatus: true,
      items: { 
        where: { sellerId: seller.id },
        select: { sellerRevenue: true }
      }
    }
  });
  
  let byStatus = {};
  for (const o of orders) {
    const s = o.paymentStatus;
    if (!byStatus[s]) byStatus[s] = 0;
    for (const item of o.items) {
      byStatus[s] += item.sellerRevenue || 0;
    }
  }
  
  console.log('=== REVENUE POR STATUS DE PAGAMENTO ===');
  for (const [status, total] of Object.entries(byStatus)) {
    console.log(status + ': R$ ' + total.toFixed(2));
  }
  
  await prisma.$disconnect();
}
check();
