/**
 * Script para atualizar variantes de produtos AliExpress já importados
 * 
 * Este script busca os detalhes dos produtos via API e atualiza o campo variants
 * no banco de dados usando a nova estrutura padronizada.
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

// Função para gerar assinatura HMAC-SHA256
function generateSign(appSecret, params) {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort()
  
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  
  const signature = crypto.createHmac('sha256', appSecret)
    .update(signString)
    .digest('hex')
    .toUpperCase()
  
  return signature
}

// Buscar detalhes do produto via API
async function fetchProductDetails(appKey, appSecret, accessToken, productId) {
  const apiUrl = 'https://api-sg.aliexpress.com/sync'
  const timestamp = Date.now().toString()

  const params = {
    app_key: appKey,
    method: 'aliexpress.ds.product.get',
    session: accessToken,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    product_id: productId,
    target_currency: 'BRL',
    target_language: 'pt',
    ship_to_country: 'BR'
  }

  const sign = generateSign(appSecret, params)
  params['sign'] = sign

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    })

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error_response) {
      console.log(`⚠️ Erro API: ${data.error_response.msg}`)
      return null
    }

    return data.aliexpress_ds_product_get_response?.result || null
  } catch (error) {
    console.error(`❌ Erro ao buscar detalhes:`, error.message)
    return null
  }
}

// Parser simplificado para variantes do AliExpress
function parseAliExpressVariants(rawResponse) {
  const skuList = rawResponse.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
  const productId = rawResponse.ae_item_base_info_dto?.product_id?.toString() || ''
  
  const propertiesMap = new Map()
  
  const skus = skuList.map(sku => {
    const skuProperties = []
    const aeProperties = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o || []
    
    aeProperties.forEach(prop => {
      const propertyId = prop.sku_property_id?.toString() || ''
      const optionId = prop.property_value_id?.toString() || ''
      
      if (!propertiesMap.has(propertyId)) {
        propertiesMap.set(propertyId, {
          id: propertyId,
          name: prop.sku_property_name || 'Variação',
          type: detectPropertyType(prop.sku_property_name),
          options: []
        })
      }
      
      const property = propertiesMap.get(propertyId)
      if (!property.options.find(o => o.id === optionId)) {
        property.options.push({
          id: optionId,
          value: prop.property_value_definition_name || prop.sku_property_value || '',
          label: prop.sku_property_value || prop.property_value_definition_name || '',
          image: prop.sku_image || undefined
        })
      }
      
      skuProperties.push({
        propertyId,
        propertyName: prop.sku_property_name || 'Variação',
        optionId,
        optionValue: prop.property_value_definition_name || '',
        optionLabel: prop.sku_property_value || ''
      })
    })
    
    const price = parseFloat(sku.offer_sale_price || sku.sku_price || '0')
    const originalPrice = parseFloat(sku.sku_price || sku.offer_sale_price || '0')
    const stock = parseInt(sku.sku_available_stock || sku.s_k_u_available_stock || '0')
    const skuImage = aeProperties.find(p => p.sku_image)?.sku_image
    
    return {
      skuId: sku.sku_id?.toString() || '',
      skuAttr: sku.sku_attr || '',
      price,
      originalPrice: originalPrice !== price ? originalPrice : undefined,
      stock,
      available: stock > 0,
      image: skuImage,
      properties: skuProperties
    }
  })
  
  const prices = skus.map(s => s.price).filter(p => p > 0)
  const totalStock = skus.reduce((sum, s) => sum + s.stock, 0)
  
  return {
    version: '1.0',
    source: 'aliexpress',
    sourceProductId: productId,
    lastUpdated: new Date().toISOString(),
    properties: Array.from(propertiesMap.values()),
    skus,
    metadata: {
      currency: 'BRL',
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      totalStock,
      hasImages: skus.some(s => !!s.image)
    }
  }
}

function detectPropertyType(propertyName) {
  const name = (propertyName || '').toLowerCase()
  
  if (name.includes('cor') || name.includes('color') || name.includes('colour')) {
    return 'color'
  }
  if (name.includes('tamanho') || name.includes('size') || name.includes('tam')) {
    return 'size'
  }
  if (name.includes('estilo') || name.includes('style')) {
    return 'style'
  }
  if (name.includes('material')) {
    return 'material'
  }
  if (name.includes('voltagem') || name.includes('voltage') || name.includes('volt')) {
    return 'voltage'
  }
  if (name.includes('memória') || name.includes('memory') || name.includes('storage') || name.includes('gb')) {
    return 'storage'
  }
  
  return 'other'
}

async function main() {
  console.log('🔄 Atualizando variantes de produtos AliExpress...\n')
  
  // Buscar credenciais do AliExpress
  const auth = await prisma.aliExpressAuth.findFirst()
  
  if (!auth) {
    console.error('❌ Autenticação do AliExpress não encontrada!')
    return
  }
  
  const appKey = auth.appKey
  const appSecret = auth.appSecret
  const accessToken = auth.accessToken
  
  if (!appKey || !appSecret || !accessToken) {
    console.error('❌ Credenciais incompletas!')
    console.log('appKey:', appKey ? 'OK' : 'FALTA')
    console.log('appSecret:', appSecret ? 'OK' : 'FALTA')
    console.log('accessToken:', accessToken ? 'OK' : 'FALTA')
    return
  }
  
  console.log('✅ Credenciais carregadas\n')
  
  // Buscar produtos do AliExpress sem variantes
  const products = await prisma.product.findMany({
    where: {
      supplier: {
        name: { contains: 'AliExpress' }
      },
      OR: [
        { variants: null },
        { variants: '' }
      ]
    },
    select: {
      id: true,
      name: true,
      supplierSku: true
    },
    take: 50 // Aumentado para pegar mais produtos
  })
  
  console.log(`📦 Encontrados ${products.length} produtos sem variantes\n`)
  
  let updated = 0
  let failed = 0
  
  for (const product of products) {
    const productId = product.supplierSku
    
    if (!productId || productId.startsWith('ae_demo')) {
      console.log(`⏭️ Pulando ${product.name?.substring(0, 40)}... (sem SKU válido)`)
      continue
    }
    
    console.log(`\n🔍 Processando: ${product.name?.substring(0, 50)}...`)
    console.log(`   ID AliExpress: ${productId}`)
    
    // Buscar detalhes via API
    const details = await fetchProductDetails(appKey, appSecret, accessToken, productId)
    
    if (!details) {
      console.log('   ❌ Não foi possível buscar detalhes')
      failed++
      continue
    }
    
    // Verificar se tem SKUs
    const skuInfo = details.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
    
    if (skuInfo.length === 0) {
      console.log('   ⚠️ Produto sem variações (SKU único)')
      failed++
      continue
    }
    
    // Parsear variantes
    const variants = parseAliExpressVariants(details)
    const variantsJson = JSON.stringify(variants)
    const totalStock = variants.metadata?.totalStock || variants.skus.reduce((sum, s) => sum + s.stock, 0)
    
    console.log(`   ✅ ${variants.skus.length} SKUs encontrados`)
    console.log(`   📊 Propriedades: ${variants.properties.map(p => `${p.name} (${p.options.length} opções)`).join(', ')}`)
    console.log(`   📦 Estoque total: ${totalStock}`)
    
    // Atualizar no banco (variants E stock)
    await prisma.product.update({
      where: { id: product.id },
      data: { 
        variants: variantsJson,
        stock: totalStock  // Atualizar estoque com o total das variantes
      }
    })
    
    console.log(`   💾 Atualizado no banco!`)
    updated++
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n========================================')
  console.log(`📊 Resumo:`)
  console.log(`   ✅ Atualizados: ${updated}`)
  console.log(`   ❌ Falhas: ${failed}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
