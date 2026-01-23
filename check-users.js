const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Verificar config de API Key
  const apiKeys = await prisma.systemConfig.findFirst({ 
    where: { key: 'api.keys' }
  });
  console.log('api.keys:', apiKeys);
  
  const mobileKey = await prisma.systemConfig.findFirst({ 
    where: { key: 'app.apiKey' }
  });
  console.log('app.apiKey:', mobileKey);
  
  await prisma.$disconnect();
}

main();
