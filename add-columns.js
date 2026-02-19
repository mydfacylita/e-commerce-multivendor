const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumns() {
  try {
    console.log('1. Adicionando awaitingShipmentNotifiedAt...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`order\` 
      ADD COLUMN \`awaitingShipmentNotifiedAt\` DATETIME(3) NULL
    `);
    console.log('   ✅ Coluna adicionada\n');
    
    console.log('2. Adicionando availableAt...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`affiliate_sale\`
      ADD COLUMN \`availableAt\` DATETIME(3) NULL
    `);
    console.log('   ✅ Coluna adicionada\n');
    
    console.log('✅ Todas as colunas adicionadas com sucesso!');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addColumns();
