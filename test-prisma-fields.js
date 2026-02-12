const { PrismaClient } = require('@prisma/client');

async function testPrismaFields() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 TESTANDO CAMPOS DO PRISMA CLIENT\n');

    // Testar se consegue fazer query com novos campos
    console.log('✅ Testando campos da tabela Order...');
    const orderWithNewFields = await prisma.order.findFirst({
      select: {
        id: true,
        parentOrderId: true,  // Campo que foi adicionado
        affiliateId: true,    // Campo crítico para afiliados
        affiliateCode: true,  // Campo crítico para afiliados
        deliveredAt: true,    // Campo para entrega
        couponCode: true,     // Campo para cupons
        fraudScore: true      // Campo antifralde
      }
    });
    console.log('   ✓ Conseguiu fazer SELECT com novos campos');

    console.log('✅ Testando campos da tabela AffiliateSale...');
    const affiliateSaleFields = await prisma.affiliateSale.findFirst({
      select: {
        id: true,
        availableAt: true,  // Campo que implementamos para carência
        commissionAmount: true,
        status: true
      }
    });
    console.log('   ✓ Conseguiu fazer SELECT com availableAt');

    console.log('✅ Testando campos da tabela User...');
    const userFields = await prisma.user.findFirst({
      select: {
        id: true,
        blockedAt: true,     // Campo adicionado
        blockedReason: true, // Campo adicionado
        workForSellerId: true,
        employeeRole: true
      }
    });
    console.log('   ✓ Conseguiu fazer SELECT com campos de bloqueio');

    console.log('\n🎉 TODOS OS CAMPOS ESTÃO FUNCIONANDO NO PRISMA CLIENT!');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    if (error.message.includes('Unknown field')) {
      console.error('   Provavelmente um campo não foi reconhecido pelo Prisma');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaFields();