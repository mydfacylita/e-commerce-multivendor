const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrdersForAliExpress() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 PEDIDOS PARA ENVIAR AO ALIEXPRESS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const orders = await prisma.order.findMany({
    where: { 
      status: { in: ['PROCESSING', 'PAID'] }
    },
    include: { 
      items: { 
        include: { 
          product: { 
            select: { 
              id: true, 
              name: true, 
              isDropshipping: true,
              availableForDropship: true,
              supplierUrl: true, 
              aliExpressProductId: true,
              supplierSku: true
            } 
          } 
        } 
      },
      user: {
        select: { name: true, email: true }
      }
    },
    take: 10
  });
  
  console.log(`📦 Pedidos encontrados: ${orders.length}\n`);
  
  for (const order of orders) {
    console.log(`━━━ PEDIDO: ${order.id.slice(0,15)}... ━━━`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Cliente: ${order.user?.name || order.buyerName}`);
    console.log(`   Total: R$ ${order.total}`);
    console.log(`   Endereço: ${order.shippingAddress?.slice(0, 50)}...`);
    
    console.log('\n   📦 ITENS:');
    for (const item of order.items) {
      const p = item.product;
      console.log(`   - ${p.name}`);
      console.log(`     itemType: ${item.itemType}`);
      console.log(`     isDropshipping: ${p.isDropshipping}`);
      console.log(`     AliExpressProductId: ${p.aliExpressProductId || '❌ N/A'}`);
      console.log(`     supplierUrl: ${p.supplierUrl ? '✅ Presente' : '❌ N/A'}`);
      console.log(`     supplierSku: ${p.supplierSku || 'N/A'}`);
      
      // Verificar se pode enviar ao AliExpress
      const canSend = p.aliExpressProductId || p.supplierUrl;
      console.log(`     🚀 Pode enviar: ${canSend ? '✅ SIM' : '❌ NÃO'}`);
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkOrdersForAliExpress();
