const { PrismaClient } = require('@prisma/client');

async function fixOrder() {
  const prisma = new PrismaClient({ log: [] });
  
  try {
    const orderId = 'cmk8zrf7r000213s6tshjsxv1';
    const paymentId = '141542750886';
    
    // Verificar pedido atual
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentStatus: true, paymentId: true, total: true, parentOrderId: true }
    });
    
    console.log('📦 Pedido atual:', JSON.stringify(order, null, 2));
    
    if (!order) {
      console.log('❌ Pedido não encontrado!');
      return;
    }
    
    // Atualizar pedido
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING',
        paymentStatus: 'approved',
        paymentId: paymentId,
        paymentApprovedAt: new Date()
      }
    });
    
    console.log('✅ Pedido atualizado para PROCESSING!');
    
    // Se tiver parentOrderId, atualizar pedidos relacionados
    if (order.parentOrderId) {
      const related = await prisma.order.updateMany({
        where: { 
          parentOrderId: order.parentOrderId,
          status: 'PENDING'
        },
        data: {
          status: 'PROCESSING',
          paymentStatus: 'approved',
          paymentApprovedAt: new Date()
        }
      });
      console.log(`✅ ${related.count} pedidos relacionados atualizados!`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrder();
