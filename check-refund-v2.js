const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    // Buscar gateway
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO' }
    })
    
    // Parse config corretamente
    let config = gateway.config
    if (typeof config === 'string') {
      config = JSON.parse(config)
    }
    
    console.log('Gateway:', gateway.gateway)
    console.log('Ativo:', gateway.isActive)
    console.log('Token (primeiros 30 chars):', config.accessToken?.substring(0, 30) + '...')
    
    const token = config.accessToken
    const paymentId = '141542750886'
    
    // Verificar status do pagamento
    console.log('\n--- Verificando pagamento ---')
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const payment = await paymentRes.json()
    console.log('Status HTTP:', paymentRes.status)
    console.log('ID:', payment.id)
    console.log('Status:', payment.status)
    console.log('Valor:', payment.transaction_amount)
    console.log('Collector ID:', payment.collector_id)
    console.log('Date approved:', payment.date_approved)
    
    // Verificar estornos existentes
    console.log('\n--- Verificando estornos existentes ---')
    const refundsRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const refunds = await refundsRes.json()
    console.log('Status refunds GET:', refundsRes.status)
    console.log('Estornos:', JSON.stringify(refunds, null, 2))
    
    // Tentar criar estorno (com body vazio para estorno total)
    console.log('\n--- Tentando criar estorno total ---')
    const createRefundRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `test-refund-${Date.now()}`
      },
      body: JSON.stringify({})
    })
    const refundResult = await createRefundRes.json()
    console.log('Status criação estorno:', createRefundRes.status)
    console.log('Resultado:', JSON.stringify(refundResult, null, 2))
    
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
