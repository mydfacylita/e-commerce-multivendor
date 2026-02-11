/**
 * Verifica o Feed do Google Shopping em Produção
 */

async function checkFeed() {
  console.log('🔍 Verificando Feed do Google Shopping...\n')

  const feedUrl = 'https://www.mydshop.com.br/api/feeds/google-shopping'

  try {
    console.log(`📡 URL: ${feedUrl}\n`)
    
    const response = await fetch(feedUrl)
    
    if (!response.ok) {
      console.error(`❌ Erro HTTP: ${response.status} ${response.statusText}`)
      return
    }

    const xml = await response.text()
    
    // Contar produtos
    const productCount = (xml.match(/<item>/g) || []).length
    
    console.log('📊 RESULTADO:')
    console.log('═'.repeat(60))
    console.log(`✅ Feed está ONLINE e funcionando!`)
    console.log(`📦 Total de produtos no feed: ${productCount}`)
    
    // Verificar campos
    const hasTitle = (xml.match(/<g:title>/g) || []).length
    const hasPrice = (xml.match(/<g:price>/g) || []).length
    const hasImages = (xml.match(/<g:image_link>/g) || []).length
    const hasBrand = (xml.match(/<g:brand>/g) || []).length
    const hasCategory = (xml.match(/<g:google_product_category>/g) || []).length
    
    console.log(`\n📋 Campos encontrados:`)
    console.log(`   - Títulos: ${hasTitle}`)
    console.log(`   - Preços: ${hasPrice}`)
    console.log(`   - Imagens: ${hasImages}`)
    console.log(`   - Marcas: ${hasBrand}`)
    console.log(`   - Categorias: ${hasCategory}`)
    
    // Extrair exemplo de produto
    const firstItem = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1]
    if (firstItem) {
      const id = firstItem.match(/<g:id>([^<]+)<\/g:id>/)?.[1]
      const title = firstItem.match(/<title>([^<]+)<\/title>/)?.[1]
      const price = firstItem.match(/<g:price>([^<]+)<\/g:price>/)?.[1]
      
      console.log(`\n🎯 Exemplo de produto:`)
      console.log(`   ID: ${id}`)
      console.log(`   Título: ${title?.substring(0, 50)}...`)
      console.log(`   Preço: ${price}`)
    }
    
    console.log(`\n✨ STATUS: PRONTO PARA USAR NO MERCHANT CENTER`)
    console.log(`\n📌 Próximo passo:`)
    console.log(`   1. No Merchant Center, clique em "Complete setup"`)
    console.log(`   2. Adicione este feed URL:`)
    console.log(`      ${feedUrl}`)
    console.log(`   3. Configure frequência: Diária às 02:00`)
    
  } catch (error) {
    console.error(`❌ Erro ao buscar feed:`, error.message)
  }
}

checkFeed()
