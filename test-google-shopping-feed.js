/**
 * Script de Teste - Feed do Google Shopping
 * 
 * Execução: node test-google-shopping-feed.js
 */

async function testGoogleShoppingFeed() {
  console.log('🧪 Testando Feed do Google Shopping...\n')

  const baseUrl = 'http://localhost:3000'
  const feedUrl = `${baseUrl}/api/feeds/google-shopping`

  try {
    console.log(`📡 Buscando feed: ${feedUrl}`)
    
    const response = await fetch(feedUrl)
    
    if (!response.ok) {
      console.error(`❌ Erro HTTP: ${response.status} ${response.statusText}`)
      return
    }

    const contentType = response.headers.get('content-type')
    console.log(`📋 Content-Type: ${contentType}`)

    if (!contentType?.includes('xml')) {
      console.warn(`⚠️  Content-Type deveria ser application/xml`)
    }

    const xml = await response.text()
    
    console.log(`\n📊 ESTATÍSTICAS DO FEED:`)
    console.log('─'.repeat(50))
    
    // Contar produtos
    const productCount = (xml.match(/<item>/g) || []).length
    console.log(`✅ Total de produtos: ${productCount}`)
    
    // Verificar campos obrigatórios
    const checks = {
      'ID': /<g:id>/g,
      'Title': /<g:title>/g,
      'Description': /<g:description>/g,
      'Link': /<g:link>/g,
      'Image': /<g:image_link>/g,
      'Availability': /<g:availability>/g,
      'Price': /<g:price>/g,
      'Brand': /<g:brand>/g,
      'Condition': /<g:condition>/g,
      'Category': /<g:google_product_category>/g,
    }

    console.log(`\n📋 CAMPOS OBRIGATÓRIOS:`)
    console.log('─'.repeat(50))
    
    for (const [field, regex] of Object.entries(checks)) {
      const count = (xml.match(regex) || []).length
      const status = count === productCount ? '✅' : '❌'
      console.log(`${status} ${field}: ${count}/${productCount}`)
    }

    // Verificar campos opcionais mas recomendados
    console.log(`\n📋 CAMPOS OPCIONAIS:`)
    console.log('─'.repeat(50))
    
    const optionalChecks = {
      'Sale Price': /<g:sale_price>/g,
      'GTIN': /<g:gtin>/g,
      'Additional Images': /<g:additional_image_link>/g,
    }

    for (const [field, regex] of Object.entries(optionalChecks)) {
      const count = (xml.match(regex) || []).length
      console.log(`   ${field}: ${count}`)
    }

    // Verificar estoque
    const inStock = (xml.match(/<g:availability>in_stock<\/g:availability>/g) || []).length
    const outOfStock = (xml.match(/<g:availability>out_of_stock<\/g:availability>/g) || []).length
    
    console.log(`\n📦 ESTOQUE:`)
    console.log('─'.repeat(50))
    console.log(`✅ Em estoque: ${inStock}`)
    console.log(`❌ Sem estoque: ${outOfStock}`)

    // Verificar marcas
    const brands = new Set()
    const brandMatches = xml.matchAll(/<g:brand><!\[CDATA\[(.*?)\]\]><\/g:brand>/g)
    for (const match of brandMatches) {
      brands.add(match[1])
    }
    
    console.log(`\n🏷️  MARCAS ENCONTRADAS:`)
    console.log('─'.repeat(50))
    const brandArray = Array.from(brands).slice(0, 10)
    brandArray.forEach(brand => console.log(`   • ${brand}`))
    if (brands.size > 10) {
      console.log(`   ... e mais ${brands.size - 10} marcas`)
    }

    // Verificar categorias Google
    const categories = new Set()
    const catMatches = xml.matchAll(/<g:google_product_category>(\d+)<\/g:google_product_category>/g)
    for (const match of catMatches) {
      categories.add(match[1])
    }
    
    console.log(`\n📂 CATEGORIAS GOOGLE:`)
    console.log('─'.repeat(50))
    const catArray = Array.from(categories)
    catArray.forEach(cat => console.log(`   • Category ID: ${cat}`))

    // Verificar preços
    const prices = []
    const priceMatches = xml.matchAll(/<g:price>([\d.]+) BRL<\/g:price>/g)
    for (const match of priceMatches) {
      prices.push(parseFloat(match[1]))
    }
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
      
      console.log(`\n💰 ANÁLISE DE PREÇOS:`)
      console.log('─'.repeat(50))
      console.log(`   Mínimo: R$ ${minPrice.toFixed(2)}`)
      console.log(`   Máximo: R$ ${maxPrice.toFixed(2)}`)
      console.log(`   Média: R$ ${avgPrice.toFixed(2)}`)
    }

    // Verificar tamanho do feed
    const sizeKB = (xml.length / 1024).toFixed(2)
    const limitKB = 4096 // Limite aproximado do Google
    
    console.log(`\n📏 TAMANHO DO FEED:`)
    console.log('─'.repeat(50))
    console.log(`   Tamanho: ${sizeKB} KB`)
    console.log(`   Limite: ${limitKB} KB`)
    console.log(`   Status: ${parseFloat(sizeKB) < limitKB ? '✅ OK' : '⚠️  Muito grande'}`)

    // Mostrar exemplo de produto
    console.log(`\n📦 EXEMPLO DE PRODUTO (PRIMEIRO DO FEED):`)
    console.log('─'.repeat(50))
    const firstItem = xml.match(/<item>(.*?)<\/item>/s)
    if (firstItem) {
      const itemXml = firstItem[0]
      
      const extractField = (field) => {
        const regex = new RegExp(`<g:${field}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/g:${field}>`)
        const match = itemXml.match(regex)
        return match ? match[1] : 'N/A'
      }

      console.log(`   ID: ${extractField('id')}`)
      console.log(`   Title: ${extractField('title').substring(0, 60)}...`)
      console.log(`   Price: ${extractField('price')}`)
      console.log(`   Brand: ${extractField('brand')}`)
      console.log(`   Availability: ${extractField('availability')}`)
      console.log(`   Category: ${extractField('google_product_category')}`)
    }

    console.log(`\n✅ TESTE CONCLUÍDO COM SUCESSO!`)
    console.log('═'.repeat(50))
    console.log(`\n📋 PRÓXIMOS PASSOS:`)
    console.log(`   1. Acesse: https://merchants.google.com/`)
    console.log(`   2. Configure o feed: ${feedUrl}`)
    console.log(`   3. Siga o guia: GOOGLE-SHOPPING-SETUP.md`)
    console.log(`\n`)

  } catch (error) {
    console.error(`\n❌ ERRO AO TESTAR FEED:`, error.message)
    console.log(`\n💡 DICAS:`)
    console.log(`   1. Certifique-se que o servidor está rodando (npm run dev)`)
    console.log(`   2. Verifique se há produtos ativos no banco de dados`)
    console.log(`   3. Verifique a conexão com o MySQL`)
  }
}

// Executar teste
testGoogleShoppingFeed()
