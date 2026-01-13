const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

async function verifyPaymentDirect() {
  const paymentId = process.argv[2] || '141542750886';
  const prisma = new PrismaClient({ log: [] });
  
  try {
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    });
    
    let config = gateway.config;
    if (typeof config === 'string') config = JSON.parse(config);
    
    console.log('🔍 Verificando pagamento:', paymentId);
    console.log('🔑 Token:', config.accessToken.substring(0, 30) + '...');
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': 'Bearer ' + config.accessToken }
    });
    
    const data = await response.json();
    
    console.log('\n=== DETALHES DO PAGAMENTO ===');
    console.log('ID:', data.id);
    console.log('Status:', data.status);
    console.log('Status Detail:', data.status_detail);
    console.log('Valor:', data.transaction_amount);
    console.log('Método:', data.payment_method_id);
    console.log('Data Criação:', data.date_created);
    console.log('Data Aprovação:', data.date_approved);
    console.log('External Reference:', data.external_reference);
    console.log('Descrição:', data.description);
    
    // Verificar pedido associado
    if (data.external_reference) {
      const order = await prisma.order.findUnique({
        where: { id: data.external_reference },
        select: { id: true, status: true, paymentStatus: true, paymentId: true }
      });
      
      if (order) {
        console.log('\n=== PEDIDO NO SISTEMA ===');
        console.log('Order ID:', order.id);
        console.log('Status:', order.status);
        console.log('Payment Status:', order.paymentStatus);
        console.log('Payment ID salvo:', order.paymentId);
        
        // Se pagamento aprovado mas pedido pending, corrigir
        if (data.status === 'approved' && order.status === 'PENDING') {
          console.log('\n🔧 CORRIGINDO: Pagamento aprovado mas pedido pendente!');
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'PROCESSING',
              paymentStatus: 'approved',
              paymentApprovedAt: new Date(data.date_approved || Date.now())
            }
          });
          console.log('✅ Pedido atualizado para PROCESSING!');
        }
      } else {
        console.log('\n⚠️ Pedido não encontrado:', data.external_reference);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPaymentDirect();
