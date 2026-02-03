import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * CRON: Sincronizar estoque e preços de produtos AliExpress
 * 
 * O que faz:
 * 1. Busca produtos do AliExpress no banco
 * 2. Para cada produto, consulta a API do AliExpress
 * 3. Atualiza em variants.skus[]: stock, price, available
 * 4. Atualiza em selectedSkus[]: stock, costPrice, customPrice (recalculado com margem)
 * 5. Atualiza no produto: costPrice (menor preço), price (menor preço + margem)
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Gerar assinatura para API AliExpress
function generateSign(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase()
}

// Buscar produto na API do AliExpress
async function fetchAliExpressProduct(
  productId: string,
  appKey: string,
  appSecret: string,
  accessToken: string
): Promise<any[] | null> {
  const params: Record<string, string> = {
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
  params.sign = generateSign(params, appSecret)

  const url = `https://api-sg.aliexpress.com/sync?${Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.error_response) {
      console.log(`[SYNC] Erro API para ${productId}: ${data.error_response.msg}`)
      return null
    }

    const skuInfo = data.aliexpress_ds_product_get_response?.result?.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o
    return Array.isArray(skuInfo) ? skuInfo : skuInfo ? [skuInfo] : null
  } catch (error: any) {
    console.log(`[SYNC] Erro fetch ${productId}: ${error.message}`)
    return null
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Verificar autorização
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('\n[SYNC] ========== INICIANDO SINCRONIZAÇÃO ==========')

  try {
    // Buscar credenciais AliExpress
    const auth = await prisma.aliExpressAuth.findFirst({
      where: { accessToken: { not: null } }
    })

    if (!auth?.accessToken) {
      return NextResponse.json({ error: 'Sem credenciais AliExpress' }, { status: 400 })
    }

    // Paginação - buscar produtos em lotes
    const BATCH_SIZE = 100
    let page = 0
    let totalProducts = 0
    let synced = 0
    let errors = 0
    let pricesUpdated = 0
    const results: any[] = []
    let hasMore = true

    // Contar total de produtos
    const totalCount = await prisma.product.count({
      where: {
        supplierSku: { not: null },
        OR: [
          { supplierUrl: { contains: 'aliexpress.com' } },
          { category: { slug: 'importados' } },
          { supplier: { type: 'aliexpress' } }
        ]
      }
    })

    console.log(`[SYNC] Total de produtos para sincronizar: ${totalCount}`)

    while (hasMore) {
      // Buscar lote de produtos
      const products = await prisma.product.findMany({
        where: {
          supplierSku: { not: null },
          OR: [
            { supplierUrl: { contains: 'aliexpress.com' } },
            { category: { slug: 'importados' } },
            { supplier: { type: 'aliexpress' } }
          ]
        },
        select: {
          id: true,
          name: true,
          supplierSku: true,
          costPrice: true,
          price: true,
          margin: true,
          stock: true,
          variants: true,
          selectedSkus: true
        },
        skip: page * BATCH_SIZE,
        take: BATCH_SIZE,
        orderBy: { id: 'asc' }
      })

      if (products.length === 0) {
        hasMore = false
        break
      }

      totalProducts += products.length
      console.log(`[SYNC] Processando lote ${page + 1} (${products.length} produtos, total: ${totalProducts}/${totalCount})`)

    for (const product of products) {
      const productId = product.supplierSku!
      
      // Verificar se é ID válido (numérico)
      if (!/^\d+$/.test(productId)) {
        continue
      }

      // Rate limit - reduzido para processar mais rápido
      await new Promise(r => setTimeout(r, 300))

      console.log(`[SYNC] Processando: ${product.name.substring(0, 50)}...`)

      // Buscar na API
      const apiSkus = await fetchAliExpressProduct(productId, auth.appKey, auth.appSecret, auth.accessToken)

      if (!apiSkus || apiSkus.length === 0) {
        errors++
        results.push({ id: product.id, name: product.name, status: 'error', reason: 'API não retornou SKUs' })
        continue
      }

      // Criar mapa de preços/estoque da API por skuId
      const apiData: Record<string, { price: number, stock: number }> = {}
      let minApiPrice = Infinity

      for (const sku of apiSkus) {
        const skuId = String(sku.sku_id || sku.ae_sku_id || sku.id || '')
        const price = parseFloat(sku.offer_sale_price) || parseFloat(sku.sku_price) || 0
        const stock = parseInt(sku.sku_available_stock) || (sku.sku_stock === true ? 999 : 0)
        
        if (skuId) {
          apiData[skuId] = { price, stock }
          if (price > 0 && price < minApiPrice) {
            minApiPrice = price
          }
        }
      }

      console.log(`[SYNC] API retornou ${Object.keys(apiData).length} SKUs, menor preço: R$ ${minApiPrice.toFixed(2)}`)

      // Margem do produto (default 20%) - arredondar para evitar valores absurdos
      let productMargin = Number(product.margin) || 20
      if (productMargin > 100) productMargin = 50 // Limite máximo razoável
      productMargin = Math.round(productMargin) // Arredondar para inteiro

      // ========== ATUALIZAR variants.skus[] ==========
      let updatedVariants: string | undefined
      let variantsUpdatedCount = 0

      if (product.variants) {
        try {
          const variantsData = JSON.parse(product.variants as string)
          
          if (variantsData.skus && Array.isArray(variantsData.skus)) {
            variantsData.skus = variantsData.skus.map((sku: any) => {
              const skuId = String(sku.skuId)
              const api = apiData[skuId]
              
              if (api) {
                variantsUpdatedCount++
                return {
                  ...sku,
                  price: api.price,
                  stock: api.stock,
                  available: api.stock > 0
                }
              }
              return sku
            })

            // Atualizar metadata
            variantsData.lastUpdated = new Date().toISOString()
            if (variantsData.metadata) {
              variantsData.metadata.minPrice = minApiPrice !== Infinity ? minApiPrice : variantsData.metadata.minPrice
              variantsData.metadata.totalStock = Object.values(apiData).reduce((sum: number, s: any) => sum + s.stock, 0)
            }

            updatedVariants = JSON.stringify(variantsData)
          }
        } catch (e) {
          console.log(`[SYNC] Erro parsing variants: ${e}`)
        }
      }

      // ========== ATUALIZAR selectedSkus[] ==========
      let updatedSelectedSkus: string | undefined
      let selectedUpdatedCount = 0
      let pricesRecalculated = 0

      if (product.selectedSkus) {
        try {
          const selectedData = JSON.parse(product.selectedSkus as string)
          
          if (Array.isArray(selectedData)) {
            const updated = selectedData.map((sku: any) => {
              const skuId = String(sku.skuId)
              const api = apiData[skuId]
              
              if (api) {
                selectedUpdatedCount++
                
                const oldCostPrice = Number(sku.costPrice) || 0
                const newCostPrice = api.price
                
                // Margem do SKU - usar a do SKU, ou do produto, arredondada
                let margin = Number(sku.margin) || productMargin
                if (margin > 100) margin = 50
                margin = Math.round(margin)
                
                // Recalcular customPrice se preço mudou
                let newCustomPrice = Number(sku.customPrice) || 0
                if (newCostPrice !== oldCostPrice && newCostPrice > 0) {
                  newCustomPrice = Number((newCostPrice * (1 + margin / 100)).toFixed(2))
                  pricesRecalculated++
                  console.log(`[SYNC] SKU ${skuId}: custo R$ ${oldCostPrice.toFixed(2)} → R$ ${newCostPrice.toFixed(2)}, venda R$ ${sku.customPrice} → R$ ${newCustomPrice} (margem ${margin}%)`)
                }

                return {
                  ...sku,
                  stock: api.stock,
                  costPrice: newCostPrice,
                  customPrice: newCustomPrice,
                  available: api.stock > 0
                }
              }
              return sku
            })

            updatedSelectedSkus = JSON.stringify(updated)
          }
        } catch (e) {
          console.log(`[SYNC] Erro parsing selectedSkus: ${e}`)
        }
      }

      // ========== CALCULAR PREÇOS DO PRODUTO ==========
      const previousCostPrice = Number(product.costPrice) || 0
      const newCostPrice = minApiPrice !== Infinity ? minApiPrice : previousCostPrice
      const newPrice = Number((newCostPrice * (1 + productMargin / 100)).toFixed(2))
      const totalStock = Object.values(apiData).reduce((sum: number, s: any) => sum + s.stock, 0)

      const priceChanged = Math.abs(newCostPrice - previousCostPrice) > 0.01

      // ========== SALVAR NO BANCO ==========
      await prisma.product.update({
        where: { id: product.id },
        data: {
          costPrice: newCostPrice,
          price: newPrice,
          stock: Math.min(product.stock || 999, totalStock),
          supplierStock: totalStock,
          lastSyncAt: new Date(),
          ...(updatedVariants && { variants: updatedVariants }),
          ...(updatedSelectedSkus && { selectedSkus: updatedSelectedSkus })
        }
      })

      synced++
      if (priceChanged) pricesUpdated++

      results.push({
        id: product.id,
        name: product.name.substring(0, 50),
        status: 'ok',
        variantsUpdated: variantsUpdatedCount,
        selectedUpdated: selectedUpdatedCount,
        pricesRecalculated,
        priceChanged,
        costPrice: { old: previousCostPrice, new: newCostPrice },
        price: newPrice,
        totalStock
      })

      console.log(`[SYNC] ✅ ${product.name.substring(0, 30)}: ${variantsUpdatedCount} variants, ${selectedUpdatedCount} selected, ${pricesRecalculated} preços recalculados`)
    }

      // Próximo lote
      page++
      
      // Se processou menos que o batch, acabou
      if (products.length < BATCH_SIZE) {
        hasMore = false
      }
    } // fim do while

    // Log de sincronização
    await (prisma as any).syncLog?.create({
      data: {
        type: 'ALIEXPRESS_STOCK',
        totalItems: totalProducts,
        synced,
        errors,
        details: JSON.stringify({ pricesUpdated, pages: page, results: results.slice(0, 50) }),
        duration: Date.now() - startTime
      }
    }).catch(() => null)

    const duration = Date.now() - startTime

    console.log(`\n[SYNC] ========== RESUMO ==========`)
    console.log(`[SYNC] Total produtos: ${totalProducts} (${page} lotes)`)
    console.log(`[SYNC] Sincronizados: ${synced}/${totalProducts}`)
    console.log(`[SYNC] Preços atualizados: ${pricesUpdated}`)
    console.log(`[SYNC] Erros: ${errors}`)
    console.log(`[SYNC] Tempo: ${(duration / 1000).toFixed(1)}s`)
    console.log(`[SYNC] ================================\n`)

    return NextResponse.json({
      success: true,
      summary: {
        total: totalProducts,
        batches: page,
        synced,
        pricesUpdated,
        errors,
        duration
      },
      results
    })

  } catch (error: any) {
    console.error('[SYNC] Erro geral:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
