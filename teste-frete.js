/**
 * Teste COMPLETO de frete - CEP fora do MA (deve usar Correios)
 */
const http = require('http')

const API_KEY = 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'

const postData = JSON.stringify({
  cep: '01310-100',  // SP - fora do MA
  cartValue: 49.90,
  products: [{
    id: 'cmk4d6tko000g9o4rs0x2t1qz',
    quantity: 1,
    price: 49.90
  }]
})

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/shipping/quote',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'Content-Length': Buffer.byteLength(postData)
  }
}

console.log('🧪 TESTE COMPLETO DE FRETE')
console.log('=' .repeat(50))
console.log('CEP: 01310-100 (SP)')
console.log('Produto: cmk4d6tko000g9o4rs0x2t1qz')
console.log('=' .repeat(50))

const req = http.request(options, (res) => {
  console.log(`\n📡 Status: ${res.statusCode}`)
  
  let data = ''
  res.on('data', (chunk) => { data += chunk })
  
  res.on('end', () => {
    console.log('\n📦 RESPOSTA:')
    try {
      const result = JSON.parse(data)
      console.log(JSON.stringify(result, null, 2))
      
      if (result.method === 'CORREIOS') {
        console.log('\n✅ SUCESSO! Correios funcionando!')
      } else if (result.method === 'REGRA_PERSONALIZADA') {
        console.log('\n✅ Regra personalizada aplicada')
      } else if (result.method === 'FALLBACK') {
        console.log('\n⚠️ FALLBACK - Verifique os logs do servidor')
      }
    } catch (e) {
      console.log(data)
    }
  })
})

req.on('error', (err) => {
  console.error('❌ Erro:', err.message)
})

req.write(postData)
req.end()