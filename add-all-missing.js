const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAllMissingColumns() {
  const columns = [
    { table: 'order', column: 'notificationsSent', type: 'JSON NULL' },
  ];
  
  for (const col of columns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${col.table}\` ADD COLUMN \`${col.column}\` ${col.type}`);
      console.log(`✅ ${col.column} adicionada`);
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log(`⚠️  ${col.column} já existe`);
      } else {
        console.error(`❌ ${col.column}:`, err.message);
      }
    }
  }
  
  await prisma.$disconnect();
}

addAllMissingColumns();
