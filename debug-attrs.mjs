// Script de diagnóstico: verifica o que ae_item_properties retorna para produtos sem atributos
import { PrismaClient } from '/var/www/mydshop/node_modules/@prisma/client/index.js'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function fetchProductDetails(appKey, appSecret, accessToken, productId) {
  const params = {
    app_key: appKey,
    method: 'aliexpress.ds.product.get',
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    timestamp: Date.now().toString(),
    session: accessToken,
    product_id: productId,
    ship_to_country: 'BR',
    target_currency: 'BRL',
    target_language: 'pt'
  }

  const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort()
  const signStr = sortedKeys.map(k => `${k}${params[k]}`).join('')
  params.sign = crypto.createHmac('sha256', appSecret).update(signStr).digest('hex').toUpperCase()

  const url = `https://api-sg.aliexpress.com/sync?${Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
  const res = await fetch(url)
  const data = await res.json()
  return data.aliexpress_ds_product_get_response?.result || null
}

async function main() {
  // Pegar credenciais
  const auth = await prisma.aliExpressAuth.findFirst()
  if (!auth) { console.log('Sem credenciais'); process.exit(1) }

  // Pegar 5 produtos dropshipping sem atributos
  const products = await prisma.product.findMany({
    where: { isDropshipping: true, attributes: null },
    select: { id: true, name: true, supplierSku: true },
    take: 5
  })

  console.log(`\n=== Testando ${products.length} produtos sem atributos ===\n`)

  for (const p of products) {
    const productId = p.supplierSku?.replace('ali_', '')
    if (!productId) { console.log(`${p.name}: sem supplierSku`); continue }

    console.log(`\nProduto: ${p.name.substring(0, 50)}`)
    console.log(`AliExpress ID: ${productId}`)

    const result = await fetchProductDetails(auth.appKey, auth.appSecret, auth.accessToken, productId)
    
    if (!result) {
      console.log('  ❌ API retornou null')
      continue
    }

    // Checar mobile_detail
    const baseInfo = result.ae_item_base_info_dto || {}
    console.log(`  mobile_detail: ${baseInfo.mobile_detail ? `✅ (${String(baseInfo.mobile_detail).length} chars)` : '❌ vazio'}`)
    
    // Checar ae_item_properties
    const props = result.ae_item_properties?.ae_item_property
    if (props) {
      const list = Array.isArray(props) ? props : [props]
      console.log(`  ae_item_properties: ✅ ${list.length} itens`)
      list.slice(0, 5).forEach(p => console.log(`    - ${p.attr_name}: ${p.attr_value}`))
    } else {
      console.log(`  ae_item_properties: ❌ vazio/null`)
    }

    await new Promise(r => setTimeout(r, 500)) // rate limit
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
