const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInvalidPaymentIds() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICANDO PEDIDOS COM PAYMENTID INVÁLIDO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const orders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      paymentId: { not: null }
    },
    select: { id: true, paymentId: true }
  });
  
  let fixed = 0;
  
  for (const order of orders) {
    // PaymentId válido do Mercado Pago é numérico
    const isNumeric = /^\d+$/.test(order.paymentId);
    
    if (!isNumeric) {
      console.log(`❌ INVÁLIDO: ${order.id.slice(0, 12)}... -> ${order.paymentId}`);
      
      // Limpar o paymentId inválido
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentId: null }
      });
      
      console.log(`   ✅ paymentId limpo`);
      fixed++;
    } else {
      console.log(`✅ OK: ${order.id.slice(0, 12)}... -> ${order.paymentId}`);
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Total: ${orders.length} | Corrigidos: ${fixed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

fixInvalidPaymentIds();
