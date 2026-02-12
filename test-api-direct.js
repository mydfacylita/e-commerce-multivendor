const http = require('http')

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/affiliates',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
}

console.log('🔍 Testando API diretamente...\n')

const req = http.request(options, (res) => {
  let data = ''

  res.on('data', (chunk) => {
    data += chunk
  })

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`)
    console.log(`Headers:`, res.headers)
    console.log('\nResposta:')
    try {
      const json = JSON.parse(data)
      console.log(JSON.stringify(json, null, 2))
    } catch (e) {
      console.log(data)
    }
  })
})

req.on('error', (error) => {
  console.error('❌ Erro:', error.message)
})

req.end()
