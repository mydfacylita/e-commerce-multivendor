const { PrismaClient } = require('@prisma/client');

async function enableCorreios() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Ativando API dos Correios...');
    
    await prisma.systemConfig.update({
      where: { key: 'correios.enabled' },
      data: { value: 'true' }
    });
    
    console.log('✅ API dos Correios ativada!');
    
    // Verifica status atual
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'correios.' }
      },
      orderBy: { key: 'asc' }
    });
    
    console.log('\n📦 Configurações dos Correios atuais:');
    configs.forEach(config => {
      console.log(`   ${config.key}: ${config.value}`);
    });
    
    console.log('\n🎯 A API dos Correios agora está ativa e pode ser usada para calcular fretes!');
    
  } catch (error) {
    console.error('❌ Erro ao ativar API dos Correios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableCorreios();