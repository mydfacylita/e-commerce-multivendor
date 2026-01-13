// Script para verificar configurações do app no banco de dados
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n📱 CONFIGURAÇÕES DO APP NO BANCO DE DADOS\n');
    console.log('='.repeat(60));
    
    // Buscar todas as configs do app
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'app.' }
      },
      orderBy: { key: 'asc' }
    });
    
    if (configs.length === 0) {
      console.log('\n⚠️  Nenhuma configuração do app encontrada no banco!');
      console.log('   Você precisa ir em /admin/configuracoes/aparencia-app e clicar em "Salvar"');
    } else {
      console.log(`\n✅ Encontradas ${configs.length} configurações:\n`);
      
      for (const config of configs) {
        const value = config.value.length > 50 
          ? config.value.substring(0, 50) + '...' 
          : config.value;
        console.log(`  ${config.key}: ${value}`);
      }
    }
    
    // Verificar cores especificamente
    console.log('\n\n🎨 CORES DO TEMA:');
    console.log('-'.repeat(40));
    
    const colorKeys = [
      'app.primaryColor',
      'app.secondaryColor',
      'app.accentColor',
      'app.backgroundColor',
      'app.textColor'
    ];
    
    for (const key of colorKeys) {
      const config = configs.find(c => c.key === key);
      if (config) {
        console.log(`  ✓ ${key}: ${config.value}`);
      } else {
        console.log(`  ✗ ${key}: NÃO CONFIGURADO (usando padrão)`);
      }
    }
    
    // Verificar imagens
    console.log('\n\n🖼️  IMAGENS:');
    console.log('-'.repeat(40));
    
    const imageKeys = ['app.logo', 'app.icon', 'app.splashScreen'];
    
    for (const key of imageKeys) {
      const config = configs.find(c => c.key === key);
      if (config && config.value) {
        console.log(`  ✓ ${key}: ${config.value}`);
      } else {
        console.log(`  ✗ ${key}: NÃO CONFIGURADO`);
      }
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
