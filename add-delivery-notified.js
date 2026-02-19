const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addDeliveryNotifiedAt() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`order\` 
      ADD COLUMN \`deliveryNotifiedAt\` DATETIME(3) NULL
    `);
    console.log('✅ deliveryNotifiedAt adicionada');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    if (err.message.includes('Duplicate column')) {
      console.log('⚠️ Coluna já existe');
      await prisma.$disconnect();
      process.exit(0);
    }
    console.error('❌ Erro:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addDeliveryNotifiedAt();
