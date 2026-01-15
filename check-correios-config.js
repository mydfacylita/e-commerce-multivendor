const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: {
        contains: 'correios'
      }
    }
  });
  
  console.log('Configurações Correios:', JSON.stringify(configs, null, 2));
  
  await prisma.$disconnect();
}

check().catch(console.error);
