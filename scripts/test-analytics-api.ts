/**
 * Script de teste para API de Analytics
 * 
 * Como usar:
 * 1. Configure a API_KEY no .env (ANALYTICS_API_KEY)
 * 2. Execute: npx tsx scripts/test-analytics-api.ts
 */

const API_URL = 'http://localhost:3000/api/analytics/track'
const API_KEY = process.env.ANALYTICS_API_KEY || 'analytics_key_' + process.env.NEXTAUTH_SECRET?.substring(0, 20)

async function testAnalyticsAPI() {
  console.log('🧪 Testando API de Analytics\n')
  console.log(`📍 URL: ${API_URL}`)
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...\n`)

  const tests = [
    {
      name: 'page_view',
      description: 'Visitante na home',
      data: {
        page: '/',
        url: 'http://localhost:3000/',
        visitorId: 'visitor_' + Date.now(),
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referrer: ''
      }
    },
    {
      name: 'page_view',
      description: 'Visitante em produtos',
      data: {
        page: '/produtos',
        url: 'http://localhost:3000/produtos',
        visitorId: 'visitor_' + Date.now(),
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referrer: 'http://localhost:3000/'
      }
    },
    {
      name: 'visitor',
      description: 'Novo visitante identificado',
      data: {
        visitorId: 'visitor_' + Date.now(),
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        country: 'BR',
        city: 'São Paulo'
      }
    },
    {
      name: 'add_to_cart',
      description: 'Produto adicionado ao carrinho',
      data: {
        productId: 'prod_123',
        productName: 'Produto Teste',
        price: 99.90,
        quantity: 1,
        visitorId: 'visitor_' + Date.now()
      }
    },
    {
      name: 'search',
      description: 'Busca realizada',
      data: {
        query: 'notebook',
        results: 15,
        visitorId: 'visitor_' + Date.now()
      }
    }
  ]

  let successCount = 0
  let errorCount = 0

  for (const test of tests) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(test)
      })

      const result = await response.json()

      if (response.ok) {
        console.log(`✅ ${test.name}: ${test.description}`)
        successCount++
      } else {
        console.log(`❌ ${test.name}: ${result.error}`)
        errorCount++
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Erro na requisição - ${error}`)
      errorCount++
    }

    // Pequeno delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n📊 Resultado:`)
  console.log(`   ✅ Sucessos: ${successCount}`)
  console.log(`   ❌ Erros: ${errorCount}`)
  console.log(`\n💡 Verifique os dados em: http://localhost:3000/admin/analytics`)
}

// Executar teste
testAnalyticsAPI().catch(console.error)
