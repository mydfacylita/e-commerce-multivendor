/**
 * Teste com logs completos dos Correios
 */
const API_KEY = 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
const BASE_URL = 'http://localhost:3001'

async function testShippingWithLogs() {
  try {
    const productId = 'cmk4d6tko000g9o4rs0x2t1qz'
    
    console.log('🧪 TESTE COM LOGS COMPLETOS DOS CORREIOS')
    console.log('=' * 50)
    
    const products = [
      {
        id: productId,
        quantity: 1,
        price: 49.90
      }
    ]

    const response = await fetch(`${BASE_URL}/api/shipping/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        cep: '01310-100', // SP (fora do MA)
        cartValue: 49.90,
        products: products
      })
    })

    console.log(`📡 Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ RESULTADO:')
      console.log(JSON.stringify(data, null, 2))
    } else {
      const errorText = await response.text()
      console.log('❌ ERRO:')
      console.log(errorText)
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message)
  }
}

testShippingWithLogs()