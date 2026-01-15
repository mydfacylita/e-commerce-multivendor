/**
 * 🔍 Verificar regras de frete ativas
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkShippingRules() {
  console.log('🔍 Verificando regras de frete ativas...\n');

  try {
    const rules = await prisma.shippingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });

    console.log(`📋 Encontradas ${rules.length} regras ativas:\n`);

    rules.forEach((rule, index) => {
      console.log(`${index + 1}. ${rule.name}`);
      console.log(`   🎯 Tipo: ${rule.regionType}`);
      console.log(`   💰 Custo: R$ ${rule.shippingCost.toFixed(2)}`);
      console.log(`   📦 Peso: ${rule.minWeight || '0'}kg - ${rule.maxWeight || '∞'}kg`);
      console.log(`   💳 Carrinho: R$ ${rule.minCartValue?.toFixed(2) || '0'} - R$ ${rule.maxCartValue?.toFixed(2) || '∞'}`);
      console.log(`   📍 Regiões: ${rule.regions}`);
      console.log(`   🆓 Frete grátis: ${rule.freeShippingMin ? `Acima de R$ ${rule.freeShippingMin.toFixed(2)}` : 'Não'}`);
      console.log(`   🏆 Prioridade: ${rule.priority}\n`);
    });

    // Sugestões para forçar Correios
    console.log('💡 PARA FORÇAR CORREIOS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Temporariamente desabilitar todas as regras');
    console.log('2. Testar com peso/valor fora dos limites das regras');
    console.log('3. Testar com CEP que não se encaixa nas regiões');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro ao verificar regras:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShippingRules();