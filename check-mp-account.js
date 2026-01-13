const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMPAccount() {
  const gateway = await prisma.paymentGateway.findFirst({
    where: { gateway: 'MERCADOPAGO', isActive: true }
  });
  
  let config = gateway.config;
  if (typeof config === 'string') config = JSON.parse(config);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICANDO CONTA MERCADO PAGO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Verificar usuário
  const userRes = await fetch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: 'Bearer ' + config.accessToken }
  });
  const user = await userRes.json();
  
  console.log('👤 DADOS DA CONTA:');
  console.log('   User ID:', user.id);
  console.log('   Nickname:', user.nickname);
  console.log('   Email:', user.email);
  console.log('   Status:', JSON.stringify(user.status));
  console.log('   Site ID:', user.site_id);
  console.log('   Tags:', user.tags);
  console.log('');
  
  // Verificar métodos de pagamento disponíveis
  const methodsRes = await fetch('https://api.mercadopago.com/v1/payment_methods', {
    headers: { Authorization: 'Bearer ' + config.accessToken }
  });
  const methods = await methodsRes.json();
  
  const pix = methods.find(m => m.id === 'pix');
  console.log('💳 PIX DISPONÍVEL:', pix ? 'SIM' : 'NÃO');
  if (pix) {
    console.log('   Status:', pix.status);
    console.log('   Min amount:', pix.min_allowed_amount);
    console.log('   Max amount:', pix.max_allowed_amount);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

checkMPAccount();
