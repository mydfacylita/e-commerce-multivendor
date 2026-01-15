/**
 * Diagnóstico completo do sistema de frete
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE FRETE')
  console.log('=' .repeat(60))
  
  // 1. Verificar Correios
  console.log('\n📦 CONFIGURAÇÕES CORREIOS:')
  const correiosEnabled = await prisma.systemConfig.findFirst({ where: { key: 'correios.enabled' } })
  const cepOrigem = await prisma.systemConfig.findFirst({ where: { key: 'correios.cepOrigem' } })
  console.log('   correios.enabled:', correiosEnabled?.value || 'NÃO CONFIGURADO')
  console.log('   correios.cepOrigem:', cepOrigem?.value || 'NÃO CONFIGURADO')
  
  // 2. Verificar produto
  console.log('\n📦 PRODUTO DE TESTE:')
  const product = await prisma.product.findUnique({
    where: { id: 'cmk4d6tko000g9o4rs0x2t1qz' },
    select: { id: true, name: true, weight: true, length: true, width: true, height: true }
  })
  if (product) {
    console.log('   ID:', product.id)
    console.log('   Nome:', product.name)
    console.log('   Peso:', product.weight, 'kg')
    console.log('   Dimensões:', product.length, 'x', product.width, 'x', product.height, 'cm')
    
    const hasAllDimensions = product.weight && product.length && product.width && product.height
    console.log('   ✅ Todas dimensões preenchidas:', hasAllDimensions ? 'SIM' : 'NÃO')
  } else {
    console.log('   ❌ PRODUTO NÃO ENCONTRADO!')
  }
  
  // 3. Verificar regras de frete
  console.log('\n📋 REGRAS DE FRETE ATIVAS:')
  const rules = await prisma.shippingRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' }
  })
  if (rules.length === 0) {
    console.log('   Nenhuma regra ativa')
  } else {
    rules.forEach((rule, i) => {
      console.log(`   ${i+1}. ${rule.name} (${rule.regionType}) - R$ ${rule.shippingCost} - Prioridade: ${rule.priority}`)
      console.log(`      Regiões: ${rule.regions}`)
    })
  }
  
  // 4. Testar identificação de estado
  console.log('\n🗺️ TESTE DE IDENTIFICAÇÃO DE ESTADO:')
  const testCeps = ['01310100', '65000000', '20000000']
  for (const cep of testCeps) {
    const cepNum = parseInt(cep)
    let state = null
    
    // Ranges do MA
    if (cepNum >= 65000000 && cepNum <= 65999999) state = 'MA'
    // Ranges do SP
    else if (cepNum >= 1000000 && cepNum <= 19999999) state = 'SP'
    // Ranges do RJ
    else if (cepNum >= 20000000 && cepNum <= 28999999) state = 'RJ'
    
    console.log(`   CEP ${cep}: ${state || 'DESCONHECIDO'}`)
  }
  
  // 5. API Key
  console.log('\n🔑 API KEY:')
  const apiKey = await prisma.systemConfig.findFirst({ where: { key: 'app.apiKey' } })
  console.log('   Configurada:', apiKey ? 'SIM' : 'NÃO')
  if (apiKey) {
    console.log('   Valor:', apiKey.value.substring(0, 20) + '...')
  }
  
  console.log('\n' + '=' .repeat(60))
  console.log('✅ DIAGNÓSTICO CONCLUÍDO')
}

main().finally(() => prisma.$disconnect())