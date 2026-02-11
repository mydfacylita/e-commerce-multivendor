const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'Smart Watch' } },
    select: {
      id: true,
      name: true,
      price: true,
      costPrice: true,
      totalCost: true,
      dropshippingCommission: true,
      isDropshipping: true
    }
  });
  
  console.log('=== PRODUTO SMART WATCH ===');
  console.log(JSON.stringify(product, null, 2));
  
  // Ver pedido com esse produto
  const orderItem = await prisma.orderItem.findFirst({
    where: { 
      product: { name: { contains: 'Smart Watch' } },
      itemType: 'DROPSHIPPING'
    },
    select: {
      id: true,
      price: true,
      quantity: true,
      costPrice: true,
      supplierCost: true,
      commissionRate: true,
      commissionAmount: true,
      sellerRevenue: true,
      itemType: true
    }
  });
  
  console.log('\n=== ORDER ITEM DROPSHIPPING ===');
  console.log(JSON.stringify(orderItem, null, 2));
  
  await prisma.$disconnect();
}
check();
