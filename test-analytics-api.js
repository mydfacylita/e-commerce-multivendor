// Script de teste para API de Analytics
// Execute: node test-analytics-api.js

const API_URL = 'http://localhost:3000/api/analytics/track'
const API_KEY = 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'

// Teste 1: Page View
async function testPageView() {
  console.log('📄 Teste 1: Registrando visualização de página...')
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      name: 'page_view',
      data: {
        page: '/produtos/smartphone-x',
        visitorId: 'visitor_' + Date.now(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referrer: 'https://google.com/search?q=smartphone',
        timestamp: new Date().toISOString()
      },
      description: 'Visualização da página de produto'
    })
  })

  const result = await response.json()
  console.log('Resultado:', result)
  console.log('Status:', response.status, '\n')
}

// Teste 2: Add to Cart
async function testAddToCart() {
  console.log('🛒 Teste 2: Registrando adição ao carrinho...')
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      name: 'add_to_cart',
      data: {
        productId: 'prod_123',
        productName: 'Smartphone X Pro',
        price: 1299.90,
        quantity: 1,
        visitorId: 'visitor_' + Date.now()
      },
      description: 'Produto adicionado ao carrinho'
    })
  })

  const result = await response.json()
  console.log('Resultado:', result)
  console.log('Status:', response.status, '\n')
}

// Teste 3: Visitor
async function testVisitor() {
  console.log('👤 Teste 3: Registrando novo visitante...')
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      name: 'visitor',
      data: {
        visitorId: 'visitor_' + Date.now(),
        ip: '192.168.1.100',
        country: 'Brasil',
        city: 'São Paulo',
        device: 'Mobile',
        browser: 'Chrome',
        firstVisit: new Date().toISOString()
      },
      description: 'Novo visitante registrado'
    })
  })

  const result = await response.json()
  console.log('Resultado:', result)
  console.log('Status:', response.status, '\n')
}

// Teste 4: API Key inválida
async function testInvalidKey() {
  console.log('❌ Teste 4: Testando com API key inválida...')
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'chave_invalida'
    },
    body: JSON.stringify({
      name: 'page_view',
      data: { page: '/' }
    })
  })

  const result = await response.json()
  console.log('Resultado:', result)
  console.log('Status:', response.status, '\n')
}

// Executar todos os testes
async function runTests() {
  console.log('🧪 Iniciando testes da API de Analytics\n')
  console.log('=' .repeat(50), '\n')
  
  await testPageView()
  await testAddToCart()
  await testVisitor()
  await testInvalidKey()
  
  console.log('=' .repeat(50))
  console.log('✅ Testes concluídos!')
}

runTests().catch(console.error)
