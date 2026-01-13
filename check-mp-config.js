const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfig() {
  const gateway = await prisma.paymentGateway.findFirst({
    where: { gateway: 'MERCADOPAGO', isActive: true }
  });
  
  let config = gateway.config;
  if (typeof config === 'string') config = JSON.parse(config);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 CONFIGURAÇÃO MERCADO PAGO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Access Token:', config.accessToken ? config.accessToken.substring(0, 30) + '...' : 'NÃO CONFIGURADO');
  console.log('Public Key:', config.publicKey || config.public_key || 'NÃO CONFIGURADO');
  console.log('Environment:', config.environment || 'não definido');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

checkConfig();
