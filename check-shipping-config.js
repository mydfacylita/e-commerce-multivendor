const { PrismaClient } = require('@prisma/client');

async function checkShippingConfig() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando configurações de frete...\n');
    
    // Verifica configurações relacionadas a frete
    const shippingConfigs = await prisma.systemConfig.findMany({
      where: {
        OR: [
          { key: { contains: 'frete' } },
          { key: { contains: 'shipping' } },
          { key: { contains: 'correios' } }
        ]
      }
    });
    
    if (shippingConfigs.length > 0) {
      console.log(`✅ Encontradas ${shippingConfigs.length} configurações de frete:`);
      shippingConfigs.forEach(config => {
        console.log(`   ${config.key}: ${config.value}`);
      });
    } else {
      console.log('❌ Nenhuma configuração específica de frete/correios encontrada');
    }
    
    console.log('\n📦 Verificando API dos Correios...');
    
    // Verifica se há produtos sem peso/dimensões
    const productsWithoutWeight = await prisma.product.findMany({
      where: {
        OR: [
          { weight: null },
          { weight: 0 },
          { length: null },
          { width: null },
          { height: null }
        ]
      },
      select: {
        id: true,
        name: true,
        weight: true,
        length: true,
        width: true,
        height: true
      }
    });
    
    console.log(`\n📊 Produtos sem peso ou dimensões: ${productsWithoutWeight.length}`);
    if (productsWithoutWeight.length > 0) {
      console.log('⚠️  Primeiros 5 produtos que precisam de peso/dimensões:');
      productsWithoutWeight.slice(0, 5).forEach(product => {
        console.log(`   - ${product.name} (peso: ${product.weight || 'NULL'}, dim: ${product.length || 'NULL'}x${product.width || 'NULL'}x${product.height || 'NULL'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar configurações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShippingConfig();