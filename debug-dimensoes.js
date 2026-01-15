/**
 * 🔍 Debug detalhado das dimensões
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDimensoes() {
  console.log('🔍 Analisando dimensões do produto...\n');

  try {
    const product = await prisma.product.findUnique({
      where: { id: 'cmk4d6tko000g9o4rs0x2t1qz' }
    });

    if (!product) {
      console.log('❌ Produto não encontrado');
      return;
    }

    console.log('📊 DADOS BRUTOS:');
    console.log(`   weight: ${product.weight} (tipo: ${typeof product.weight})`);
    console.log(`   length: ${product.length} (tipo: ${typeof product.length})`);
    console.log(`   width: ${product.width} (tipo: ${typeof product.width})`);
    console.log(`   height: ${product.height} (tipo: ${typeof product.height})\n`);

    // Verificar condições como a API faz
    const hasWeight = product.weight !== null && product.weight !== undefined && product.weight > 0;
    const hasLength = product.length !== null && product.length !== undefined && product.length > 0;
    const hasWidth = product.width !== null && product.width !== undefined && product.width > 0;
    const hasHeight = product.height !== null && product.height !== undefined && product.height > 0;

    console.log('🧪 VALIDAÇÕES:');
    console.log(`   ✅ Tem peso: ${hasWeight} (${product.weight})`);
    console.log(`   ✅ Tem comprimento: ${hasLength} (${product.length})`);
    console.log(`   ✅ Tem largura: ${hasWidth} (${product.width})`);
    console.log(`   ✅ Tem altura: ${hasHeight} (${product.height})\n`);

    const hasAllDimensions = hasWeight && hasLength && hasWidth && hasHeight;
    console.log(`📋 hasAllWeightsDimensions: ${hasAllDimensions}\n`);

    // Simular o cálculo de totais
    const quantity = 1;
    const totalWeight = (product.weight || 0.1) * quantity;
    const totalLength = Math.max(0, product.length || 10);
    const totalWidth = Math.max(0, product.width || 10);
    const totalHeight = (product.height || 5) * quantity;

    console.log('📦 TOTAIS CALCULADOS:');
    console.log(`   Peso total: ${totalWeight}kg`);
    console.log(`   Dimensões: ${totalLength}x${totalWidth}x${totalHeight}cm\n`);

    // Verificar condições para Correios
    console.log('📮 CONDIÇÕES PARA CORREIOS:');
    
    const correiosEnabled = await prisma.systemConfig.findFirst({
      where: { key: 'correios.enabled' }
    });
    
    const cepOrigem = await prisma.systemConfig.findFirst({
      where: { key: 'correios.cepOrigem' }
    });

    console.log(`   Correios habilitado: ${correiosEnabled?.value === 'true'}`);
    console.log(`   CEP origem configurado: ${!!cepOrigem?.value}`);
    console.log(`   Todos com peso/dim: ${hasAllDimensions}`);
    console.log(`   Peso total > 0: ${totalWeight > 0}\n`);

    const poderiaTentarCorreios = (correiosEnabled?.value === 'true') && 
                                   !!cepOrigem?.value && 
                                   hasAllDimensions && 
                                   totalWeight > 0;

    console.log(`🎯 PODERIA TENTAR CORREIOS: ${poderiaTentarCorreios}`);

    if (!poderiaTentarCorreios) {
      console.log('\n❌ PROBLEMAS IDENTIFICADOS:');
      if (!(correiosEnabled?.value === 'true')) console.log('   - Correios não habilitado');
      if (!cepOrigem?.value) console.log('   - CEP origem não configurado');
      if (!hasAllDimensions) console.log('   - Produto sem peso/dimensões completas');
      if (!(totalWeight > 0)) console.log('   - Peso total não é positivo');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDimensoes();