const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateOrdersCarrier() {
  try {
    console.log('Atualizando todos os pedidos para transportadora própria...');
    
    const result = await prisma.order.updateMany({
      data: {
        shippingMethod: 'propria',
        shippingService: 'Entrega Própria',
        shippingCarrier: 'propria'
      }
    });
    
    console.log(`✅ ${result.count} pedidos atualizados com sucesso!`);
    
    // Verificar alguns pedidos
    const orders = await prisma.order.findMany({
      take: 5,
      select: {
        id: true,
        shippingMethod: true,
        shippingService: true,
        shippingCarrier: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\nÚltimos 5 pedidos:');
    orders.forEach(order => {
      console.log(`  - ${order.id}: ${order.shippingCarrier} (${order.shippingService})`);
    });
    
  } catch (error) {
    console.error('Erro ao atualizar pedidos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateOrdersCarrier();
