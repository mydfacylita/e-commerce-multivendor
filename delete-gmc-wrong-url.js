/**
 * delete-gmc-wrong-url.js
 *
 * Lista todos os produtos no Google Merchant Center com URL /produto/ (errada)
 * e os exclui em batch, forçando o Google a re-indexar com /produtos/ correto.
 *
 * PRÉ-REQUISITOS:
 *  1. Crie uma Service Account no Google Cloud Console com acesso ao Merchant Center
 *     https://console.cloud.google.com/iam-admin/serviceaccounts
 *  2. Baixe o JSON da chave (credentials.json) e coloque nesta pasta
 *  3. No Google Merchant Center → Configurações → Contas vinculadas → Acesso à conta
 *     adicione o e-mail da Service Account como Administrador
 *  4. Execute: node delete-gmc-wrong-url.js
 *
 * VARIÁVEIS:
 */
const MERCHANT_ID = '5719903539'         // ID do Merchant Center (da URL no GMC)
const CREDENTIALS_FILE = './gmc-service-account.json'  // caminho para o JSON da Service Account
const DRY_RUN = true  // true = apenas lista, não deleta. Mude para false para deletar de verdade.

// ────────────────────────────────────────────────────────────────────────────
const { google } = require('googleapis')
const fs = require('fs')

async function main() {
  // Carrega credenciais
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error(`\n❌ Arquivo de credenciais não encontrado: ${CREDENTIALS_FILE}`)
    console.error(`\nComo criar:\n  1. Acesse https://console.cloud.google.com/iam-admin/serviceaccounts`)
    console.error(`  2. Crie uma Service Account e baixe a chave JSON`)
    console.error(`  3. Salve como "gmc-service-account.json" nesta pasta`)
    console.error(`  4. No Merchant Center → Configurações → Acesso à conta → adicione o e-mail da Service Account`)
    process.exit(1)
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/content'],
  })

  const content = google.content({ version: 'v2.1', auth })

  console.log(`\n🔍 Listando produtos do Merchant Center (ID: ${MERCHANT_ID})...\n`)

  // Listar todos os produtos (paginado)
  let allProducts = []
  let pageToken = undefined

  do {
    const res = await content.products.list({
      merchantId: MERCHANT_ID,
      maxResults: 250,
      pageToken,
    })

    const products = res.data.resources || []
    allProducts.push(...products)
    pageToken = res.data.nextPageToken
    process.stdout.write(`  Carregados ${allProducts.length} produtos...\r`)
  } while (pageToken)

  console.log(`\n✅ Total de produtos no GMC: ${allProducts.length}\n`)

  // Filtrar produtos com URL errada (/produto/ sem S)
  const wrongUrl = allProducts.filter(p => {
    const link = p.link || ''
    return link.includes('/produto/') && !link.includes('/produtos/')
  })

  if (wrongUrl.length === 0) {
    console.log('✅ Nenhum produto com URL /produto/ encontrado. Tudo certo!')
    return
  }

  console.log(`⚠️  ${wrongUrl.length} produto(s) com URL errada (/produto/):\n`)
  wrongUrl.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.id}] ${p.title}`)
    console.log(`     URL: ${p.link}`)
  })

  if (DRY_RUN) {
    console.log(`\n🔵 DRY RUN ativado — nenhum produto foi excluído.`)
    console.log(`   Para excluir de verdade, edite o script e mude: DRY_RUN = false\n`)
    return
  }

  // Deletar em batch (máximo 100 por request)
  console.log(`\n🗑️  Excluindo ${wrongUrl.length} produto(s)...\n`)
  const BATCH_SIZE = 100
  let deletedCount = 0

  for (let i = 0; i < wrongUrl.length; i += BATCH_SIZE) {
    const batch = wrongUrl.slice(i, i + BATCH_SIZE)
    const entries = batch.map((p, idx) => ({
      batchId: idx + 1,
      merchantId: MERCHANT_ID,
      method: 'delete',
      productId: p.id,
    }))

    const res = await content.products.custombatch({
      requestBody: { entries },
    })

    const responses = res.data.entries || []
    for (const r of responses) {
      if (r.errors) {
        console.error(`  ❌ Erro no produto ${r.productId}:`, JSON.stringify(r.errors))
      } else {
        deletedCount++
        const prod = batch.find(p => p.id === r.productId)
        console.log(`  ✅ Excluído: ${prod?.title || r.productId}`)
      }
    }
  }

  console.log(`\n✅ Concluído! ${deletedCount}/${wrongUrl.length} produto(s) excluídos do GMC.`)
  console.log(`\n💡 O Google vai re-indexar os produtos via sitemap/feed nas próximas 24-72h`)
  console.log(`   com a URL correta /produtos/ graças ao redirect 301 já configurado.\n`)
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message || err)
  if (err.code === 403) {
    console.error('\n⚠️  Sem permissão. Verifique se a Service Account tem acesso ao Merchant Center.')
  }
  process.exit(1)
})
