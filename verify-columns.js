const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const orderColumns = await prisma.$queryRaw`DESCRIBE \`order\``;
    console.log('\n📋 Colunas da tabela order:');
    const notificationColumns = orderColumns.filter(c => 
      c.Field.includes('NotifiedAt') || c.Field.includes('notified') || c.Field.includes('affiliate')
    );
    console.log(notificationColumns);
    
    console.log('\n🔍 Procurando awaitingShipmentNotifiedAt...');
    const found = orderColumns.find(c => c.Field === 'awaitingShipmentNotifiedAt');
    console.log(found ? '✅ Coluna EXISTE' : '❌ Coluna NÃO EXISTE');
    
    const affiliateSaleColumns = await prisma.$queryRaw`DESCRIBE affiliate_sale`;
    console.log('\n📋 Colunas da tabela affiliate_sale:');
    console.log(affiliateSaleColumns.filter(c => c.Field === 'availableAt'));
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkColumns();
