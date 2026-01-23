const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const configs = await prisma.systemConfig.findMany();
  console.log('Keys:', configs.map(x => x.key));
  
  // Procurar correios
  const correiosConfig = configs.find(x => x.key.toLowerCase().includes('correio'));
  console.log('\nCorreios config:', correiosConfig);
  
  await prisma.$disconnect();
}

check();
