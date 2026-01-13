const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPixCreation() {
  // Buscar credenciais do MP
  const gateway = await prisma.paymentGateway.findFirst({
    where: { gateway: 'MERCADOPAGO', isActive: true }
  });
  
  let config = gateway.config;
  if (typeof config === 'string') config = JSON.parse(config);
  const accessToken = config.accessToken;
  
  console.log('🔑 Token:', accessToken.substring(0, 30) + '...');
  console.log('');
  
  // Testar com email diferente (não @gmail.com que pode ser bloqueado)
  const paymentData = {
    transaction_amount: 25.00, // Valor mais alto
    description: 'Compra MYDSHOP #12345',
    payment_method_id: 'pix',
    payer: {
      email: 'cliente@mydshop.com.br', // Email diferente
      first_name: 'Cliente',
      last_name: 'Teste',
      identification: {
        type: 'CPF',
        number: '12345678909' // CPF de teste genérico
      }
    },
    external_reference: `order-${Date.now()}`,
    metadata: {
      source: 'mydshop'
    }
  };
  
  console.log('📤 Enviando pagamento:');
  console.log(JSON.stringify(paymentData, null, 2));
  console.log('');
  
  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `test-${Date.now()}`
    },
    body: JSON.stringify(paymentData)
  });
  
  console.log('📥 Status:', response.status);
  
  const result = await response.json();
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 RESULTADO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Payment ID:', result.id);
  console.log('Status:', result.status);
  console.log('Status Detail:', result.status_detail);
  
  if (result.status === 'pending') {
    console.log('');
    console.log('✅ PIX CRIADO COM SUCESSO!');
    console.log('QR Code disponível:', result.point_of_interaction?.transaction_data?.qr_code ? 'SIM' : 'NÃO');
  } else if (result.status === 'rejected') {
    console.log('');
    console.log('❌ PIX REJEITADO');
    console.log('Motivo:', result.status_detail);
  }
  
  if (result.message) {
    console.log('Mensagem:', result.message);
  }
  if (result.cause) {
    console.log('Causa:', JSON.stringify(result.cause, null, 2));
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await prisma.$disconnect();
}

testPixCreation();
