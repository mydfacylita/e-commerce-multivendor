/**
 * Verifica se a meta tag do Google está no site
 */

async function verifyGoogleTag() {
  console.log('🔍 Verificando meta tag do Google no site...\n')

  const url = 'https://www.mydshop.com.br'

  try {
    const response = await fetch(url)
    const html = await response.text()
    
    const googleTag = 'TbwjG6y-rTDcMZKkoBqKsbHsAeiK5-74M9cwoHD5QNA'
    
    if (html.includes(googleTag)) {
      console.log('✅ META TAG ENCONTRADA NO SITE!\n')
      console.log(`🎯 Código de verificação: ${googleTag}`)
      console.log('\n📌 Próximo passo:')
      console.log('   1. Volte ao Google Merchant Center')
      console.log('   2. Clique no botão "Verify" (Verificar)')
      console.log('   3. O Google vai validar automaticamente!')
      console.log('\n✨ Deploy concluído com sucesso!')
    } else {
      console.log('❌ Meta tag NÃO encontrada')
      console.log('⚠️  Aguarde 1-2 minutos e tente novamente')
      console.log('   (O Next.js pode estar em cache)')
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar:', error.message)
  }
}

verifyGoogleTag()
