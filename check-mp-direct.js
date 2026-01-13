const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Buscar gateway
  const gateway = await p.paymentGateway.findFirst({
    where: { gateway: 'MERCADOPAGO', isActive: true }
  })

  if (!gateway) {
    console.log('❌ Gateway não encontrado')
    return
  }

  let config = gateway.config
  if (typeof config === 'string') {
    config = JSON.parse(config)
  }

  const accessToken = config.accessToken
  console.log('🔑 Token:', accessToken?.substring(0, 30) + '...')

  // Payment ID para verificar
  const paymentId = '140752271729'
  console.log(`\n🔍 Verificando pagamento ${paymentId}...\n`)

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('📥 Status HTTP:', response.status)

  const payment = await response.json()
  
  console.log('\n📄 STATUS DO PAGAMENTO:')
  console.log('  status:', payment.status)
  console.log('  status_detail:', payment.status_detail)
  console.log('  date_approved:', payment.date_approved)
  console.log('')
  console.log('RESULTADO DA VERIFICAÇÃO:')
  console.log('  paid:', payment.status === 'approved')
  console.log('  status:', payment.status)
}

main().finally(() => p.$disconnect())
