const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCorreios() {
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: { startsWith: 'correios' }
    }
  });
  
  console.log('Configurações dos Correios no banco:');
  configs.forEach(c => {
    console.log(`  ${c.key}: ${c.value}`);
  });
  
  await prisma.$disconnect();
}

checkCorreios();
