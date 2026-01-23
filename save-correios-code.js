const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.systemConfig.upsert({
    where: { key: 'correios.codigoAcesso' },
    create: { key: 'correios.codigoAcesso', value: 'mtjmhxQtLp3pXU9Cv06mFs9LLKatSTPCYEqH9qZz', category: 'correios', label: 'Código de Acesso API' },
    update: { value: 'mtjmhxQtLp3pXU9Cv06mFs9LLKatSTPCYEqH9qZz' }
  });
  console.log('Código de acesso salvo!');
  await prisma.$disconnect();
}

main();
