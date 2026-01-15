/**
 * 🔧 Temporariamente desabilitar regras de frete
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function toggleShippingRules() {
  console.log('🔧 Gerenciando regras de frete...\n');

  try {
    // Verificar status atual
    const rules = await prisma.shippingRule.findMany({
      where: { isActive: true }
    });

    console.log(`📋 Atualmente ${rules.length} regras ativas:`);
    rules.forEach(rule => {
      console.log(`   - ${rule.name}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Perguntar o que fazer
    console.log('🔧 Escolha uma ação:');
    console.log('1. DESABILITAR todas as regras (para testar Correios)');
    console.log('2. REABILITAR todas as regras');
    console.log('3. Apenas mostrar status atual');
    
    // Para este teste, vou desabilitar temporariamente
    console.log('🔄 Desabilitando regras para teste dos Correios...\n');
    
    await prisma.shippingRule.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    console.log('✅ Regras DESABILITADAS temporariamente!');
    console.log('📦 Agora os testes irão usar os Correios como prioridade');
    console.log('\n💡 Para reabilitar, execute: ');
    console.log('   node reativar-regras.js\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

toggleShippingRules();