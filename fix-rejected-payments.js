const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRejectedPayments() {
  // Buscar pedidos pendentes com paymentId
  const pendingOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      paymentId: { not: null }
    },
    select: { id: true, paymentId: true, paymentStatus: true }
  });
  
  console.log('Pedidos pendentes com paymentId:', pendingOrders.length);
  
  // Buscar credenciais do MP
  const gateway = await prisma.paymentGateway.findFirst({
    where: { gateway: 'MERCADOPAGO', isActive: true }
  });
  
  let config = gateway.config;
  if (typeof config === 'string') config = JSON.parse(config);
  const token = config.accessToken;
  
  let fixed = 0;
  for (const order of pendingOrders) {
    try {
      const res = await fetch('https://api.mercadopago.com/v1/payments/' + order.paymentId, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      if (!res.ok) {
        console.log('Erro ao verificar', order.paymentId);
        continue;
      }
      
      const payment = await res.json();
      console.log('Pedido', order.id.slice(0,8), '- Payment', order.paymentId, '- Status:', payment.status);
      
      if (payment.status === 'rejected' || payment.status === 'cancelled') {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentId: null, paymentStatus: payment.status }
        });
        console.log('  -> Limpo paymentId para nova tentativa');
        fixed++;
      }
    } catch (e) {
      console.log('Erro:', e.message);
    }
  }
  
  console.log('\nTotal corrigidos:', fixed);
  await prisma.$disconnect();
}

fixRejectedPayments();
