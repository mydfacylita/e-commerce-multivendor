const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBalances() {
  const seller = await prisma.seller.findFirst({
    where: { storeName: 'MARCIOSTORE' },
    include: { account: true }
  });
  
  console.log('=== SALDOS DO VENDEDOR ===');
  console.log('seller.balance:', seller.balance);
  console.log('seller.totalEarned:', seller.totalEarned);
  console.log('sellerAccount.balance:', seller.account?.balance);
  
  // Calcular o que deveria ser baseado nos itens pagos
  const paidItems = await prisma.orderItem.aggregate({
    where: {
      sellerId: seller.id,
      order: { paymentStatus: { in: ['PROCESSING', 'PAID'] } }
    },
    _sum: { sellerRevenue: true }
  });
  
  console.log('\n=== REVENUE CALCULADO (pedidos pagos) ===');
  console.log('Total sellerRevenue:', paidItems._sum.sellerRevenue);
  
  // Listar por status do pedido
  const byStatus = await prisma.orderItem.groupBy({
    by: ['sellerId'],
    where: {
      sellerId: seller.id
    },
    _sum: { sellerRevenue: true }
  });
  
  console.log('\n=== REVENUE TOTAL (todos pedidos) ===');
  console.log('Total:', byStatus[0]?._sum.sellerRevenue);
  
  // Transações na conta digital
  const transactions = await prisma.sellerAccountTransaction.aggregate({
    where: { sellerAccountId: seller.account?.id },
    _sum: { amount: true }
  });
  
  console.log('\n=== TRANSAÇÕES NA CONTA DIGITAL ===');
  console.log('Soma das transações:', transactions._sum.amount);
  
  await prisma.$disconnect();
}
checkBalances();
