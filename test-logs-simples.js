/**
 * Teste simples para ver logs dos Correios
 */
const http = require('http')

const postData = JSON.stringify({
  cep: '01310-100',
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
    'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6',
    'Content-Length': Buffer.byteLength(postData)
  }
}

console.log('🧪 FAZENDO REQUISIÇÃO PARA LOGS DOS CORREIOS...')
console.log('📡 URL:', `http://localhost:3000/api/shipping/quote`)

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`)
  
  let data = ''
  res.on('data', (chunk) => {
    data += chunk
  })
  
  res.on('end', () => {
    console.log('📝 Resposta bruta:')
    console.log(data)
    try {
      const result = JSON.parse(data)
      console.log('✅ JSON Parseado:')
      console.log(JSON.stringify(result, null, 2))
    } catch (e) {
      console.log('❌ Não foi possível parsear JSON')
    }
  })
})

req.on('error', (err) => {
  console.error('❌ Erro:', err.message)
})

req.write(postData)
req.end()