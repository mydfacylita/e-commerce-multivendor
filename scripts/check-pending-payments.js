/**
 * Script para verificar pagamentos pendentes
 * 
 * Execute manualmente:
 * node scripts/check-pending-payments.js
 * 
 * Ou configure como cron job:
 * */5 * * * * cd /path/to/project && node scripts/check-pending-payments.js
 */

async function checkPendingPayments() {
  try {
    console.log('🔍 Iniciando verificação de pagamentos pendentes...')
    console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`)
    
    const response = await fetch('http://localhost:3000/api/payment/check-pending', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('\n✅ Verificação concluída com sucesso!')
      console.log('📊 Resultados:')
      console.log(`   - Pedidos verificados: ${data.results.checked}`)
      console.log(`   - ✅ Aprovados: ${data.results.approved}`)
      console.log(`   - ⏳ Ainda pendentes: ${data.results.stillPending}`)
      console.log(`   - ❌ Erros: ${data.results.errors}`)
    } else {
      console.error('❌ Erro ao verificar pagamentos:', await response.text())
    }
  } catch (error) {
    console.error('❌ Erro ao executar verificação:', error)
  }
}

// Executar
checkPendingPayments()
