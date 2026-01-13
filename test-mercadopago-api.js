// Script para testar a API do Mercado Pago diretamente
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testMercadoPagoAPI() {
  console.log('\n🔍 Testando API do Mercado Pago...\n')
  
  // Buscar gateway e configuração
  const gateway = await prisma.paymentGateway.findFirst({
    where: { isActive: true, gateway: 'MERCADOPAGO' }
  })
  
  if (!gateway) {
    console.error('❌ Gateway Mercado Pago não encontrado!')
    return
  }
  
  let config = gateway.config
  if (typeof config === 'string') {
    config = JSON.parse(config)
  }
  
  const { accessToken } = config
  
  console.log('🔑 Usando Access Token:', accessToken.substring(0, 40) + '...')
  
  // Teste 1: Verificar se a credencial é válida
  console.log('\n📋 Teste 1: Verificando credenciais...')
  
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Credenciais válidas!')
      console.log('   Usuário:', data.nickname || data.id)
      console.log('   Email:', data.email)
      console.log('   País:', data.country_id)
    } else {
      const error = await response.json()
      console.error('❌ Credenciais inválidas:', error)
      return
    }
  } catch (error) {
    console.error('❌ Erro ao verificar credenciais:', error)
    return
  }
  
  // Teste 2: Verificar meios de pagamento disponíveis
  console.log('\n📋 Teste 2: Meios de pagamento disponíveis...')
  
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const methods = await response.json()
      console.log('✅ Meios de pagamento encontrados:', methods.length)
      
      // Verificar se boleto está disponível
      const boleto = methods.find(m => m.id === 'bolbradesco')
      if (boleto) {
        console.log('   ✓ Boleto Bradesco disponível:', boleto.status)
      } else {
        console.log('   ✗ Boleto Bradesco NÃO encontrado')
        // Listar boletos disponíveis
        const boletos = methods.filter(m => m.payment_type_id === 'ticket')
        console.log('   Boletos disponíveis:', boletos.map(b => b.id).join(', ') || 'Nenhum')
      }
      
      // Verificar se cartão está disponível
      const cards = methods.filter(m => m.payment_type_id === 'credit_card')
      console.log('   ✓ Cartões disponíveis:', cards.length)
    } else {
      const error = await response.json()
      console.error('❌ Erro ao buscar meios de pagamento:', error)
    }
  } catch (error) {
    console.error('❌ Erro:', error)
  }
  
  // Teste 3: Criar um pagamento PIX de teste
  console.log('\n📋 Teste 3: Criar PIX de teste (R$ 1.00)...')
  
  try {
    const paymentData = {
      transaction_amount: 1.00,
      description: 'Teste de API',
      payment_method_id: 'pix',
      payer: {
        email: 'teste@teste.com',
        first_name: 'Teste',
        last_name: 'API'
      },
      external_reference: `test-${Date.now()}`
    }
    
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `test-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ PIX criado com sucesso!')
      console.log('   ID:', result.id)
      console.log('   Status:', result.status)
      console.log('   QR Code disponível:', !!result.point_of_interaction?.transaction_data?.qr_code)
    } else {
      console.error('❌ Erro ao criar PIX:')
      console.error('   Status:', response.status)
      console.error('   Erro:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ Erro:', error)
  }
  
  console.log('\n✅ Testes concluídos!')
}

testMercadoPagoAPI()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
