import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * CRON: Sincronizar estoque de produtos AliExpress
 * Roda diariamente para verificar disponibilidade dos produtos
 * 
 * Configurar no cron: 0 6 * * * (todo dia às 6h da manhã)
 * Exemplo: curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-aliexpress-stock
 */

interface SyncResult {
  productId: string
  productName: string
  sku: string
  previousStock: number
  currentStock: number
  priceChanged: boolean
  previousPrice?: number
  currentPrice?: number
  skusUpdated?: number
  status: 'ok' | 'out_of_stock' | 'discontinued' | 'error'
  action?: string
  error?: string
}

// Informação de estoque por SKU individual
interface SkuStockInfo {
  skuId: string
  skuAttr: string
  stock: number
  price: number
  available: boolean
}

// Resultado completo com SKUs individuais
interface ProductStockResult {
  totalStock: number
  minPrice: number
  available: boolean
  skus: SkuStockInfo[]
}

// Gerar assinatura para API AliExpress (mesmo padrão do shipping/quote)
function generateAliExpressSign(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase()
}

// Buscar informações do produto no AliExpress DS API
async function fetchProductInfo(
  productId: string,
  appKey: string,
  appSecret: string,
  accessToken: string,
  shipToCountry: string = 'BR'
): Promise<ProductStockResult | null> {
  const timestamp = Date.now().toString()
  
  const params: Record<string, string> = {
    app_key: appKey,
    method: 'aliexpress.ds.product.get',
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    timestamp,
    session: accessToken,
    product_id: productId,
    ship_to_country: shipToCountry,
    target_currency: 'BRL',
    target_language: 'pt'
  }

  params.sign = generateAliExpressSign(params, appSecret)

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')

  const url = `https://api-sg.aliexpress.com/sync?${queryString}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      console.error(`[SYNC] HTTP Error: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.error_response) {
      console.error(`[SYNC] API Error: ${data.error_response.msg}`)
      return null
    }

    const result = data.aliexpress_ds_product_get_response?.result

    if (!result) {
      return null
    }

    // Processar SKUs individuais
    const skuInfo = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o
    const skuList = Array.isArray(skuInfo) ? skuInfo : skuInfo ? [skuInfo] : []
    
    let totalStock = 0
    let minPrice = Infinity
    const skus: SkuStockInfo[] = []

    console.log(`[SYNC] Produto ${productId}: ${skuList.length} SKUs encontrados`)

    for (const sku of skuList) {
      // Tentar vários campos de estoque (API retorna diferentes nomes)
      // NOTA: sku_stock é BOOLEAN (true/false), não número!
      const skuStock = parseInt(sku.sku_available_stock) || 
                       parseInt(sku.s_k_u_available_stock) ||
                       parseInt(sku.ipm_sku_stock) || 
                       (sku.sku_stock === true ? 999 : 0)
      
      const skuPrice = parseFloat(sku.offer_sale_price) || 
                       parseFloat(sku.sku_price) || 0

      totalStock += skuStock
      if (skuPrice > 0) {
        minPrice = Math.min(minPrice, skuPrice)
      }

      // Adicionar informação do SKU individual
      skus.push({
        skuId: sku.sku_id || sku.id || '',
        skuAttr: sku.sku_attr || sku.ae_sku_property_dtos?.ae_sku_property_d_t_o?.map((p: any) => 
          `${p.sku_property_id}:${p.property_value_id}`
        ).join(';') || '',
        stock: skuStock,
        price: skuPrice,
        available: skuStock > 0
      })
    }
    
    console.log(`[SYNC] Produto ${productId}: Estoque total = ${totalStock}, SKUs com estoque = ${skus.filter(s => s.stock > 0).length}/${skus.length}`)

    // Se não encontrou preço nas SKUs, tentar o preço geral
    if (minPrice === Infinity) {
      minPrice = parseFloat(result.ae_item_base_info_dto?.target_sale_price) || 
                 parseFloat(result.ae_item_base_info_dto?.target_original_price) || 0
    }

    return {
      totalStock,
      minPrice,
      available: totalStock > 0,
      skus
    }
  } catch (error: any) {
    console.error(`[SYNC] Error fetching product ${productId}:`, error.message)
    return null
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Verificar secret key (para segurança em produção)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[ALIEXPRESS-SYNC] ⚠️ Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('\n[ALIEXPRESS-SYNC] 🔄 Iniciando sincronização de estoque...')
  console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`)

  try {
    // Buscar credenciais AliExpress (usando a primeira disponível)
    const aliexpressAuth = await prisma.aliExpressAuth.findFirst({
      where: {
        accessToken: { not: null }
      }
    })

    if (!aliexpressAuth?.accessToken) {
      console.log('[ALIEXPRESS-SYNC] ❌ Nenhuma credencial AliExpress configurada')
      return NextResponse.json({
        success: false,
        error: 'Nenhuma credencial AliExpress configurada'
      }, { status: 400 })
    }

    // Buscar produtos importados do AliExpress (ativos e inativos)
    const products = await prisma.product.findMany({
      where: {
        supplierSku: { not: null },
        OR: [
          // Produtos com URL do AliExpress
          { supplierUrl: { contains: 'aliexpress.com' } },
          // Produtos da categoria Importados
          { category: { slug: 'importados' } },
          // Produtos com fornecedor AliExpress
          { supplier: { name: { contains: 'aliexpress' } } },
          // Produtos com fornecedor do tipo aliexpress
          { supplier: { type: 'aliexpress' } }
        ]
      },
      select: {
        id: true,
        name: true,
        supplierSku: true,
        supplierStock: true,
        costPrice: true,
        price: true,
        active: true,
        stock: true,
        shipFromCountry: true,
        variants: true,
        selectedSkus: true
      },
      take: 100 // Limitar a 100 produtos por execução para evitar rate limit
    })

    console.log(`[ALIEXPRESS-SYNC] 📦 ${products.length} produtos para sincronizar`)

    const results: SyncResult[] = []
    let synced = 0
    let outOfStock = 0
    let discontinued = 0
    let errors = 0
    let priceChanges = 0

    for (const product of products) {
      // Rate limiting: aguardar 500ms entre cada requisição
      await new Promise(resolve => setTimeout(resolve, 500))

      const productId = product.supplierSku!

      // Verificar se é um ID de produto AliExpress válido (numérico)
      if (!/^\d+$/.test(productId)) {
        console.log(`[ALIEXPRESS-SYNC] ⏭️ Pulando produto com SKU não-numérico: ${productId}`)
        continue
      }

      // Usar o país de origem do produto (padrão BR)
      const shipToCountry = product.shipFromCountry?.toUpperCase() || 'BR'
      console.log(`[ALIEXPRESS-SYNC] 📡 Sincronizando: ${product.name} (${productId}) - País: ${shipToCountry}`)

      const info = await fetchProductInfo(
        productId,
        aliexpressAuth.appKey,
        aliexpressAuth.appSecret,
        aliexpressAuth.accessToken,
        shipToCountry
      )

      const result: SyncResult = {
        productId: product.id,
        productName: product.name,
        sku: productId,
        previousStock: product.supplierStock || 0,
        currentStock: info?.totalStock || 0,
        priceChanged: false,
        skusUpdated: 0,
        status: 'ok'
      }

      if (!info) {
        // Produto não encontrado ou erro na API - apenas marcar como sem estoque
        // NÃO desativa o produto para permitir correção manual
        result.status = 'discontinued'
        result.action = 'Produto não encontrado no AliExpress (estoque zerado)'
        discontinued++

        // Zerar estoque de todas as variantes no JSON
        let updatedVariants: string | undefined
        if (product.variants) {
          try {
            const variantsData = JSON.parse(product.variants as string)
            if (variantsData.skus && Array.isArray(variantsData.skus)) {
              variantsData.skus = variantsData.skus.map((sku: any) => ({
                ...sku,
                stock: 0,
                available: false
              }))
              variantsData.lastUpdated = new Date().toISOString()
              if (variantsData.metadata) {
                variantsData.metadata.totalStock = 0
              }
              updatedVariants = JSON.stringify(variantsData)
              result.skusUpdated = variantsData.skus.length
            }
          } catch (e) {
            console.error(`[SYNC] Erro ao parsear variants: ${e}`)
          }
        }

        // Zerar estoque de todos os selectedSkus
        let updatedSelectedSkus: string | undefined
        if (product.selectedSkus) {
          try {
            const selectedSkusData = JSON.parse(product.selectedSkus as string)
            if (Array.isArray(selectedSkusData)) {
              const updatedData = selectedSkusData.map((sku: any) => ({
                ...sku,
                stock: 0,
                available: false
              }))
              updatedSelectedSkus = JSON.stringify(updatedData)
            }
          } catch (e) {
            console.error(`[SYNC] Erro ao parsear selectedSkus: ${e}`)
          }
        }

        await prisma.product.update({
          where: { id: product.id },
          data: {
            supplierStock: 0,
            lastSyncAt: new Date(),
            ...(updatedVariants && { variants: updatedVariants }),
            ...(updatedSelectedSkus && { selectedSkus: updatedSelectedSkus })
          }
        })
      } else if (info.totalStock === 0) {
        // Produto sem estoque - atualizar estoque mas NÃO desativar
        result.status = 'out_of_stock'
        result.action = 'Sem estoque no fornecedor'
        outOfStock++

        // Zerar estoque de todas as variantes no JSON
        let updatedVariants: string | undefined
        if (product.variants) {
          try {
            const variantsData = JSON.parse(product.variants as string)
            if (variantsData.skus && Array.isArray(variantsData.skus)) {
              variantsData.skus = variantsData.skus.map((sku: any) => ({
                ...sku,
                stock: 0,
                available: false
              }))
              variantsData.lastUpdated = new Date().toISOString()
              if (variantsData.metadata) {
                variantsData.metadata.totalStock = 0
              }
              updatedVariants = JSON.stringify(variantsData)
              result.skusUpdated = variantsData.skus.length
            }
          } catch (e) {
            console.error(`[SYNC] Erro ao parsear variants: ${e}`)
          }
        }

        // Zerar estoque de todos os selectedSkus
        let updatedSelectedSkus: string | undefined
        if (product.selectedSkus) {
          try {
            const selectedSkusData = JSON.parse(product.selectedSkus as string)
            if (Array.isArray(selectedSkusData)) {
              const updatedData = selectedSkusData.map((sku: any) => ({
                ...sku,
                stock: 0,
                available: false
              }))
              updatedSelectedSkus = JSON.stringify(updatedData)
            }
          } catch (e) {
            console.error(`[SYNC] Erro ao parsear selectedSkus: ${e}`)
          }
        }

        await prisma.product.update({
          where: { id: product.id },
          data: {
            supplierStock: 0,
            stock: 0,
            lastSyncAt: new Date(),
            ...(updatedVariants && { variants: updatedVariants }),
            ...(updatedSelectedSkus && { selectedSkus: updatedSelectedSkus })
          }
        })
      } else {
        // Produto disponível - atualizar estoque e variantes
        synced++

        // Verificar se preço mudou significativamente (mais de 10%)
        const previousCost = typeof product.costPrice === 'object' && product.costPrice !== null 
          ? (product.costPrice as any).toNumber?.() || Number(product.costPrice)
          : Number(product.costPrice) || 0
        if (previousCost > 0 && info.minPrice > 0) {
          const priceDiff = Math.abs(info.minPrice - previousCost) / previousCost
          if (priceDiff > 0.1) {
            result.priceChanged = true
            result.previousPrice = previousCost
            result.currentPrice = info.minPrice
            result.action = `Preço alterado: R$ ${previousCost.toFixed(2)} → R$ ${info.minPrice.toFixed(2)}`
            priceChanges++
          }
        }

        // Atualizar estoque de cada SKU no JSON de variantes
        let updatedVariants: string | undefined
        if (product.variants && info.skus.length > 0) {
          try {
            const variantsData = JSON.parse(product.variants as string)
            if (variantsData.skus && Array.isArray(variantsData.skus)) {
              let skusUpdatedCount = 0
              
              variantsData.skus = variantsData.skus.map((sku: any) => {
                // Tentar encontrar o SKU correspondente da API pelo skuId ou skuAttr
                const apiSku = info.skus.find((s: SkuStockInfo) => 
                  s.skuId === sku.skuId || 
                  s.skuAttr === sku.skuAttr ||
                  // Comparar apenas os IDs das propriedades (ignorar valores)
                  s.skuAttr?.split(';').sort().join(';') === sku.skuAttr?.split(';').sort().join(';')
                )
                
                if (apiSku) {
                  skusUpdatedCount++
                  return {
                    ...sku,
                    stock: apiSku.stock,
                    price: apiSku.price > 0 ? apiSku.price : sku.price,
                    available: apiSku.available
                  }
                }
                return sku
              })
              
              variantsData.lastUpdated = new Date().toISOString()
              if (variantsData.metadata) {
                variantsData.metadata.totalStock = info.totalStock
                variantsData.metadata.minPrice = info.minPrice
              }
              
              updatedVariants = JSON.stringify(variantsData)
              result.skusUpdated = skusUpdatedCount
              
              console.log(`[SYNC] Produto ${productId}: ${skusUpdatedCount}/${variantsData.skus.length} SKUs atualizados no variants`)
            }
          } catch (e) {
            console.error(`[SYNC] Erro ao parsear variants: ${e}`)
          }
        }

        // Atualizar estoque de cada SKU no JSON de selectedSkus
        let updatedSelectedSkus: string | undefined
        if (product.selectedSkus && info.skus.length > 0) {
          try {
            const selectedSkusData = JSON.parse(product.selectedSkus as string)
            if (Array.isArray(selectedSkusData)) {
              let selectedSkusUpdatedCount = 0
              
              const updatedData = selectedSkusData.map((sku: any) => {
                // Tentar encontrar o SKU correspondente da API pelo skuId
                const apiSku = info.skus.find((s: SkuStockInfo) => 
                  s.skuId === sku.skuId
                )
                
                if (apiSku) {
                  selectedSkusUpdatedCount++
                  return {
                    ...sku,
                    stock: apiSku.stock,
                    costPrice: apiSku.price > 0 ? apiSku.price : sku.costPrice,
                    available: apiSku.available
                  }
                }
                return sku
              })
              
              updatedSelectedSkus = JSON.stringify(updatedData)
              
              console.log(`[SYNC] Produto ${productId}: ${selectedSkusUpdatedCount}/${selectedSkusData.length} SKUs atualizados no selectedSkus`)
            }
          } catch (e) {
            console.error(`[SYNC] Erro ao parsear selectedSkus: ${e}`)
          }
        }

        await prisma.product.update({
          where: { id: product.id },
          data: {
            supplierStock: info.totalStock,
            stock: Math.min(product.stock || 999, info.totalStock), // Não ultrapassar estoque do fornecedor
            costPrice: result.priceChanged ? info.minPrice : undefined,
            lastSyncAt: new Date(),
            ...(updatedVariants && { variants: updatedVariants }),
            ...(updatedSelectedSkus && { selectedSkus: updatedSelectedSkus })
          }
        })
      }

      results.push(result)
    }

    // Criar log de sincronização
    const syncLog = await (prisma as any).syncLog?.create({
      data: {
        type: 'ALIEXPRESS_STOCK',
        totalItems: products.length,
        synced,
        errors,
        details: JSON.stringify({
          outOfStock,
          discontinued,
          priceChanges,
          results: results.slice(0, 50) // Salvar apenas os primeiros 50 para não estourar
        }),
        duration: Date.now() - startTime
      }
    }).catch(() => null) // Ignore se tabela não existir

    const duration = Date.now() - startTime

    console.log(`\n[ALIEXPRESS-SYNC] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[ALIEXPRESS-SYNC] 📊 RESUMO:`)
    console.log(`[ALIEXPRESS-SYNC]    Total verificados: ${products.length}`)
    console.log(`[ALIEXPRESS-SYNC]    ✅ Sincronizados: ${synced}`)
    console.log(`[ALIEXPRESS-SYNC]    ⚠️ Sem estoque: ${outOfStock}`)
    console.log(`[ALIEXPRESS-SYNC]    ❌ Descontinuados: ${discontinued}`)
    console.log(`[ALIEXPRESS-SYNC]    💰 Preços alterados: ${priceChanges}`)
    console.log(`[ALIEXPRESS-SYNC]    🚫 Erros: ${errors}`)
    console.log(`[ALIEXPRESS-SYNC]    ⏱️ Tempo: ${(duration / 1000).toFixed(1)}s`)
    console.log(`[ALIEXPRESS-SYNC] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    return NextResponse.json({
      success: true,
      summary: {
        total: products.length,
        synced,
        outOfStock,
        discontinued,
        priceChanges,
        errors,
        duration
      },
      results
    })

  } catch (error: any) {
    console.error('[ALIEXPRESS-SYNC] ❌ Erro:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
