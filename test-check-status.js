// Testar a API de check-status
const orderId = 'cmk7il12a00004jvxf944zqbw' // O pedido SEM paymentId

async function test() {
  console.log('🧪 Testando check-status para o pedido:', orderId)
  
  const response = await fetch(`http://localhost:3000/api/payment/check-status/${orderId}`)
  const data = await response.json()
  
  console.log('📥 Resposta:', JSON.stringify(data, null, 2))
}

test()
