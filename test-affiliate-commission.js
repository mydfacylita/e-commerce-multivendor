/**
 * Script de teste para sistema de comissões automáticas
 * 
 * Uso:
 * node test-affiliate-commission.js SEU_PEDIDO_ID
 */

const orderId = process.argv[2]

if (!orderId) {
  console.log('❌ Uso: node test-affiliate-commission.js SEU_PEDIDO_ID')
  console.log('   Exemplo: node test-affiliate-commission.js ca11ye041QN062namvatoy8h8')
  process.exit(1)
}

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

console.log('🧪 TESTE DO SISTEMA DE COMISSÕES AUTOMÁTICAS\n')
console.log('================================================\n')

async function test() {
  try {
    // 1. Buscar status atual do pedido
    console.log('1️⃣ Buscando pedido...')
    const orderRes = await fetch(`${baseURL}/api/orders/${orderId}`)
    
    if (!orderRes.ok) {
      throw new Error(`Pedido não encontrado: ${orderRes.status}`)
    }
    
    const order = await orderRes.json()
    console.log(`   ✅ Pedido encontrado: ${order.id}`)
    console.log(`   📦 Status atual: ${order.status}`)
    console.log(`   💰 Total: R$ ${order.total?.toFixed(2)}`)
    console.log(`   🎯 Afiliado: ${order.affiliateCode || 'Nenhum'}`)
    console.log()

    if (!order.affiliateId) {
      console.log('⚠️  Este pedido NÃO tem afiliado associado')
      console.log('   O sistema não vai processar comissão')
      console.log()
      process.exit(0)
    }

    // 2. Buscar venda do afiliado
    console.log('2️⃣ Buscando registro de venda do afiliado...')
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    const sale = await prisma.affiliateSale.findUnique({
      where: { orderId },
      include: {
        affiliate: {
          include: {
            account: true
          }
        }
      }
    })

    if (!sale) {
      console.log('   ⚠️  Venda de afiliado NÃO encontrada!')
      console.log('   Isso é um erro - venda deveria ter sido criada')
      await prisma.$disconnect()
      process.exit(1)
    }

    console.log(`   ✅ Venda encontrada: ${sale.id}`)
    console.log(`   👤 Afiliado: ${sale.affiliate.name}`)
    console.log(`   💵 Comissão: R$ ${sale.commissionAmount.toFixed(2)} (${sale.commissionRate}%)`)
    console.log(`   📊 Status da comissão: ${sale.status}`)
    console.log()

    if (sale.affiliate.account) {
      console.log(`   💳 Conta MYD do afiliado:`)
      console.log(`      Saldo atual: R$ ${sale.affiliate.account.balance.toFixed(2)}`)
      console.log()
    }

    // 3. Simular mudança de status para DELIVERED
    console.log('3️⃣ Testando processamento de comissão...')
    console.log(`   ${order.status === 'DELIVERED' ? '(Pedido já está DELIVERED)' : '(Simulando mudança para DELIVERED)'}`)
    console.log()

    const { processAffiliateCommission } = require('./lib/affiliate-commission')
    const result = await processAffiliateCommission(orderId)

    console.log('📊 RESULTADO DO PROCESSAMENTO:\n')
    console.log(`   Success: ${result.success ? '✅' : '❌'}`)
    console.log(`   Message: ${result.message}`)
    
    if (result.amount) {
      console.log(`   Amount: R$ ${result.amount.toFixed(2)}`)
    }
    
    if (result.affiliate) {
      console.log(`   Affiliate: ${result.affiliate}`)
    }
    console.log()

    // 4. Verificar resultado no banco
    console.log('4️⃣ Verificando mudanças no banco...')
    
    const updatedSale = await prisma.affiliateSale.findUnique({
      where: { orderId },
      include: {
        affiliate: {
          include: {
            account: true
          }
        }
      }
    })

    console.log(`   Status da venda: ${sale.status} → ${updatedSale.status}`)
    
    if (updatedSale.affiliate.account) {
      const oldBalance = sale.affiliate.account.balance
      const newBalance = updatedSale.affiliate.account.balance
      const diff = newBalance - oldBalance

      console.log(`   Saldo da conta MYD: R$ ${oldBalance.toFixed(2)} → R$ ${newBalance.toFixed(2)}`)
      
      if (diff > 0) {
        console.log(`   💰 Creditado: R$ ${diff.toFixed(2)}`)
      }
    }
    console.log()

    await prisma.$disconnect()

    // 5. Resumo final
    console.log('================================================\n')
    console.log('📝 RESUMO:\n')
    
    if (result.success) {
      if (result.message === 'Comissão liberada e creditada') {
        console.log('✅ SUCESSO! Comissão foi liberada e creditada na conta MYD')
      } else if (result.message === 'Comissão já liberada') {
        console.log('ℹ️  Comissão já havia sido liberada anteriormente')
      } else if (result.message === 'Aguardando entrega do pedido') {
        console.log('⏳ Aguardando pedido ser marcado como DELIVERED')
        console.log()
        console.log('   Para liberar a comissão, use um dos métodos:')
        console.log()
        console.log('   1. Via webhook:')
        console.log(`      curl -X POST ${baseURL}/api/webhooks/order-status \\`)
        console.log(`        -H "Content-Type: application/json" \\`)
        console.log(`        -d '{"orderId":"${orderId}","status":"DELIVERED"}'`)
        console.log()
        console.log('   2. Via cron job:')
        console.log(`      curl -X GET -H "Authorization: Bearer SEU_CRON_SECRET" \\`)
        console.log(`        ${baseURL}/api/jobs/process-affiliate-commissions`)
        console.log()
      } else {
        console.log(`ℹ️  ${result.message}`)
      }
    } else {
      console.log('❌ ERRO ao processar comissão:')
      console.log(`   ${result.message}`)
    }

    console.log()
    console.log('================================================')

  } catch (error) {
    console.error('\n❌ Erro durante teste:', error.message)
    console.error(error)
    process.exit(1)
  }
}

test()
