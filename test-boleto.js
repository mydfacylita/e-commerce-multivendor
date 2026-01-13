// Teste de criação de boleto diretamente
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testBoleto() {
  console.log('\n🔍 Testando criação de boleto...\n')
  
  // Buscar gateway e configuração
  const gateway = await prisma.paymentGateway.findFirst({
    where: { isActive: true, gateway: 'MERCADOPAGO' }
  })
  
  let config = gateway.config
  if (typeof config === 'string') {
    config = JSON.parse(config)
  }
  
  const { accessToken } = config
  
  // Dados do boleto COM ENDEREÇO (obrigatório pelo MP)
  const paymentData = {
    transaction_amount: 10.00,
    description: 'Teste Boleto com Endereço',
    payment_method_id: 'bolbradesco',
    payer: {
      email: 'teste@teste.com',
      first_name: 'Marcio',
      last_name: 'Gomes',
      identification: {
        type: 'CPF',
        number: '01940069300'
      },
      address: {
        zip_code: '65067380',
        street_name: 'Rua 31 de Março',
        street_number: '05',
        neighborhood: 'Tuntum',
        city: 'São Luis',
        federal_unit: 'MA'
      }
    },
    external_reference: `boleto-test-${Date.now()}`
  }
  
  console.log('📤 Enviando boleto...')
  console.log('   Dados:', JSON.stringify(paymentData, null, 2))
  
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `boleto-test-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('\n✅ Boleto criado com sucesso!')
      console.log('   ID:', result.id)
      console.log('   Status:', result.status)
      console.log('   Status Detail:', result.status_detail)
      console.log('   URL do boleto:', result.transaction_details?.external_resource_url || 'N/A')
      console.log('   Vencimento:', result.date_of_expiration || 'N/A')
      
      if (result.status === 'rejected') {
        console.log('\n⚠️  Motivo da rejeição:', result.status_detail)
      }
    } else {
      console.error('\n❌ Erro ao criar boleto:')
      console.error('   Status HTTP:', response.status)
      console.error('   Erro:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

testBoleto()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
