const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    const tables = await prisma.$queryRaw`SHOW TABLES LIKE 'affiliate%'`;
    console.log('\n📋 Tabelas de afiliados:');
    console.log(tables);
    
    const sellerAccount = await prisma.$queryRaw`DESCRIBE seller_account`;
    console.log('\n📋 Colunas de seller_account:');
    console.log(sellerAccount.filter(c => c.Field.includes('affiliate') || c.Field === 'accountType'));
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkTables();
