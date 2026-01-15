/**
 * 🔍 Debug detalhado - simular EXATAMENTE o que deveria acontecer
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Função para identificar estado pelo CEP (copiada da API)
function getCepState(cep) {
  const cepRanges = {
    'SP': [['01000000', '19999999']],
    'RJ': [['20000000', '28999999']],
    'ES': [['29000000', '29999999']],
    'MG': [['30000000', '39999999']],
    'BA': [['40000000', '48999999']],
    'SE': [['49000000', '49999999']],
    'PE': [['50000000', '56999999']],
    'AL': [['57000000', '57999999']],
    'PB': [['58000000', '58999999']],
    'RN': [['59000000', '59999999']],
    'CE': [['60000000', '63999999']],
    'PI': [['64000000', '64999999']],
    'MA': [['65000000', '65999999']],
    'PA': [['66000000', '68999999']],
    'AP': [['68900000', '68999999']],
    'AM': [['69000000', '69299999'], ['69400000', '69899999']],
    'RR': [['69300000', '69399999']],
    'AC': [['69900000', '69999999']],
    'DF': [['70000000', '72799999'], ['73000000', '73699999']],
    'GO': [['72800000', '72999999'], ['73700000', '76999999']],
    'TO': [['77000000', '77999999']],
    'MT': [['78000000', '78899999']],
    'RO': [['76800000', '76999999']],
    'MS': [['79000000', '79999999']],
    'PR': [['80000000', '87999999']],
    'SC': [['88000000', '89999999']],
    'RS': [['90000000', '99999999']]
  };

  const cleanCep = cep.replace(/\D/g, '');
  const cepNum = parseInt(cleanCep);

  for (const [state, ranges] of Object.entries(cepRanges)) {
    for (const [min, max] of ranges) {
      if (cepNum >= parseInt(min) && cepNum <= parseInt(max)) {
        return state;
      }
    }
  }
  return null;
}

async function debugDetalhado() {
  console.log('🔍 DEBUG DETALHADO - Simulando lógica da API...\n');

  try {
    // Dados do teste
    const cep = '01310100'; // São Paulo
    const cartValue = 159.20;
    const productId = 'cmk4d6tko000g9o4rs0x2t1qz';

    console.log('📊 DADOS DE ENTRADA:');
    console.log(`   CEP: ${cep}`);
    console.log(`   Valor carrinho: R$ ${cartValue}`);
    console.log(`   Produto: ${productId}\n`);

    // 1. Buscar produto e calcular peso/dimensões
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    const totalWeight = product?.weight || 0;
    const totalLength = product?.length || 0;
    const totalWidth = product?.width || 0;
    const totalHeight = product?.height || 0;
    const hasAllWeightsDimensions = !!(product?.weight && product?.length && product?.width && product?.height);

    console.log('📦 PRODUTO ENCONTRADO:');
    console.log(`   Peso: ${totalWeight}kg`);
    console.log(`   Dimensões: ${totalLength}x${totalWidth}x${totalHeight}cm`);
    console.log(`   Tem peso/dimensões: ${hasAllWeightsDimensions}\n`);

    // 2. Identificar estado
    const estado = getCepState(cep);
    console.log(`🗺️ ESTADO IDENTIFICADO: ${estado || 'Não identificado'}\n`);

    // 3. Verificar regras ativas
    const rules = await prisma.shippingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });

    console.log(`📋 REGRAS ATIVAS: ${rules.length}`);
    
    let regraAplicada = false;
    for (const rule of rules) {
      console.log(`\n🔍 Testando regra: ${rule.name} (${rule.regionType})`);
      
      // Verificar valor do carrinho
      if (rule.minCartValue && cartValue < rule.minCartValue) {
        console.log(`   ❌ Carrinho R$${cartValue} < mínimo R$${rule.minCartValue}`);
        continue;
      }
      if (rule.maxCartValue && cartValue > rule.maxCartValue) {
        console.log(`   ❌ Carrinho R$${cartValue} > máximo R$${rule.maxCartValue}`);
        continue;
      }

      // Verificar peso
      if (rule.minWeight && totalWeight < rule.minWeight) {
        console.log(`   ❌ Peso ${totalWeight}kg < mínimo ${rule.minWeight}kg`);
        continue;
      }
      if (rule.maxWeight && totalWeight > rule.maxWeight) {
        console.log(`   ❌ Peso ${totalWeight}kg > máximo ${rule.maxWeight}kg`);
        continue;
      }

      // Verificar região
      let matchesRegion = false;
      if (rule.regionType === 'NATIONWIDE') {
        matchesRegion = true;
      } else if (rule.regionType === 'STATE') {
        const regions = JSON.parse(rule.regions);
        matchesRegion = regions.includes(estado);
        console.log(`   🗺️ Regra para estados: ${regions.join(', ')}`);
        console.log(`   🗺️ CEP é do estado: ${estado}`);
        console.log(`   🗺️ Corresponde: ${matchesRegion}`);
      } else if (rule.regionType === 'ZIPCODE_RANGE') {
        // Implementar verificação de faixa de CEP se necessário
        console.log(`   📮 Verificação de faixa CEP não implementada neste debug`);
      }

      if (matchesRegion) {
        console.log(`   ✅ REGRA APLICADA: ${rule.name}`);
        regraAplicada = true;
        break;
      } else {
        console.log(`   ❌ Região não corresponde`);
      }
    }

    if (!regraAplicada) {
      console.log('\n✨ NENHUMA REGRA APLICADA - Deveria ir para CORREIOS');
      
      // Verificar configurações dos Correios
      const correiosConfig = await prisma.systemConfig.findFirst({
        where: { key: 'correios.enabled' }
      });
      
      const cepOrigemConfig = await prisma.systemConfig.findFirst({
        where: { key: 'correios.cepOrigem' }
      });

      console.log('\n📮 CONFIGURAÇÕES DOS CORREIOS:');
      console.log(`   Habilitado: ${correiosConfig?.value}`);
      console.log(`   CEP origem: ${cepOrigemConfig?.value}`);
      console.log(`   Peso/dimensões: ${hasAllWeightsDimensions}`);
      console.log(`   Peso > 0: ${totalWeight > 0}\n`);

      const deveUsarCorreios = correiosConfig?.value === 'true' && 
                               cepOrigemConfig?.value && 
                               hasAllWeightsDimensions && 
                               totalWeight > 0;

      console.log(`🎯 DEVERIA USAR CORREIOS: ${deveUsarCorreios ? '✅ SIM' : '❌ NÃO'}`);

      if (deveUsarCorreios) {
        console.log('\n📮 SIMULANDO CONSULTA DOS CORREIOS...');
        console.log(`   Origem: ${cepOrigemConfig.value}`);
        console.log(`   Destino: ${cep}`);
        console.log(`   Peso: ${Math.max(totalWeight, 0.1)}kg`);
        console.log(`   Dimensões: ${Math.max(totalLength, 20)}x${Math.max(totalWidth, 15)}x${Math.max(totalHeight, 5)}cm`);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDetalhado();