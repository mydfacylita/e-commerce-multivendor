const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const gateway = await prisma.paymentGateway.findFirst({
    where: { gateway: 'MERCADOPAGO', isActive: true }
  });
  
  let config = gateway.config;
  if (typeof config === 'string') config = JSON.parse(config);
  const token = config.accessToken;
  
  // Verificar pagamento especificado ou listar recentes
  const paymentId = process.argv[2];
  
  if (paymentId) {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💳 DETALHES DO PAGAMENTO:', paymentId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Status:', data.status);
    console.log('Status Detail:', data.status_detail);
    console.log('External Reference:', data.external_reference);
    console.log('Date Created:', data.date_created);
    console.log('Transaction Amount:', data.transaction_amount);
    console.log('Payment Method:', data.payment_method_id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    // Listar últimos pagamentos
    const res = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=NOW-1DAYS&end_date=NOW', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ÚLTIMOS PAGAMENTOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const p of (data.results || []).slice(0, 10)) {
      console.log(`ID: ${p.id} | Status: ${p.status} | Ref: ${p.external_reference} | R$ ${p.transaction_amount} | ${p.date_created}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  await prisma.$disconnect();
}

check();
