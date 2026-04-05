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
 * 
 * Segurança: Requer header Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// 🔐 Verificar autenticação CRON
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Em desenvolvimento, permitir sem secret configurado
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    return true
  }
  
  // Em produção, SEMPRE requer secret
  if (!cronSecret) {
    console.error('[CRON] ⚠️ CRON_SECRET não configurado!')
    return false
  }
  
  return authHeader === `Bearer ${cronSecret}`
}

// Gerar assinatura para API AliExpress
function generateSign(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase()
}

// Renovar access token AliExpress usando refresh token
async function refreshAliExpressToken(auth: {
  id: string
  appKey: string
  appSecret: string
  refreshToken: string
}): Promise<string | null> {
  try {
    const timestamp = Date.now().toString()
    const params: Record<string, string> = {
      app_key: auth.appKey,
      refresh_token: auth.refreshToken,
      sign_method: 'sha256',
      timestamp,
    }
    const sortedKeys = Object.keys(params).sort()
    const signString = '/auth/token/refresh' + sortedKeys.map(k => `${k}${params[k]}`).join('')
    const sign = crypto.createHmac('sha256', auth.appSecret)
      .update(signString)
      .digest('hex')
      .toUpperCase()

    const qs = sortedKeys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&') + `&sign=${sign}`
    const url = `https://api-sg.aliexpress.com/rest/auth/token/refresh?${qs}`

    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await res.json()

    const tokenData = data.aliexpress_system_oauth_access_token_get_response || data
    if (!tokenData.access_token) {
      console.error('[SYNC] ❌ Falha ao renovar token AliExpress:', data)
      return null
    }

    const expiresAt = new Date(Date.now() + parseInt(tokenData.expires_in || '0') * 1000)
    await prisma.aliExpressAuth.update({
      where: { id: auth.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || auth.refreshToken,
        expiresAt,
      },
    })

    console.log('[SYNC] ✅ Token AliExpress renovado com sucesso. Expira em:', expiresAt)
    return tokenData.access_token
  } catch (err: any) {
    console.error('[SYNC] ❌ Erro ao renovar token AliExpress:', err.message)
    return null
  }
}

// Buscar produto na API do AliExpress — retorna resultado completo
async function fetchAliExpressProduct(
  productId: string,
  appKey: string,
  appSecret: string,
  accessToken: string
): Promise<{ skus: any[]; result: any } | null> {
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

    const result = data.aliexpress_ds_product_get_response?.result
    if (!result) return null

    const skuInfo = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o
    const skus = Array.isArray(skuInfo) ? skuInfo : skuInfo ? [skuInfo] : []
    return { skus, result }
  } catch (error: any) {
    console.log(`[SYNC] Erro fetch ${productId}: ${error.message}`)
    return null
  }
}

// Extrair atributos do mobile_detail (mesma lógica do import-selected)
function extractAttributesFromMobileDetail(mobileDetailStr: string): Array<{ nome: string; valor: string }> {
  try {
    const mobileData = JSON.parse(mobileDetailStr)
    const moduleList: any[] = mobileData.moduleList || []
    const specs: Array<{ nome: string; valor: string }> = []

    for (const mod of moduleList) {
      if (mod.type !== 'text') continue
      const content: string = (mod.data?.content || '').trim()
      if (!content) continue

      const colonIdx = content.indexOf(': ')
      if (colonIdx > 0 && colonIdx < 80 && !content.includes('\n')) {
        const key = content.substring(0, colonIdx).trim()
        const value = content.substring(colonIdx + 2).trim()
        if (key && value) {
          specs.push({ nome: key, valor: value })
        }
      }
    }
    return specs
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // 🔐 Verificar autorização CRON ou usuário admin autenticado
  const isAuthorizedCron = verifyCronAuth(request)
  
  if (!isAuthorizedCron) {
    // Se não for CRON autorizado, verificar se é chamada do admin (via referer)
    const referer = request.headers.get('referer') || ''
    const isAdminCall = referer.includes('/admin/integracao/aliexpress')
    
    if (!isAdminCall) {
      console.warn('[CRON] ⚠️ Tentativa de acesso não autorizada ao sync-aliexpress-stock')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[SYNC] 👤 Sincronização manual iniciada pelo admin')
  }

  console.log('\n[SYNC] ========== INICIANDO SINCRONIZAÇÃO ==========')

  try {
    // Buscar credenciais AliExpress
    let auth = await prisma.aliExpressAuth.findFirst({
      where: { accessToken: { not: null } }
    })

    if (!auth?.accessToken) {
      return NextResponse.json({ error: 'Sem credenciais AliExpress' }, { status: 400 })
    }

    // Verificar se o token expirou ou expira nas próximas 2 horas e renovar automaticamente
    const tokenExpired = auth.expiresAt && auth.expiresAt.getTime() < Date.now() + 2 * 60 * 60 * 1000
    if (tokenExpired) {
      console.log('[SYNC] ⚠️ Token AliExpress expirado ou prestes a expirar. Tentando renovar...')
      if (auth.refreshToken) {
        const newAccessToken = await refreshAliExpressToken({
          id: auth.id,
          appKey: auth.appKey,
          appSecret: auth.appSecret,
          refreshToken: auth.refreshToken,
        })
        if (newAccessToken) {
          auth = { ...auth, accessToken: newAccessToken }
        } else {
          console.error('[SYNC] ❌ Não foi possível renovar o token. Reautorize a integração AliExpress.')
          return NextResponse.json({
            error: 'Token AliExpress expirado e não foi possível renovar automaticamente. Acesse /admin/integracao/aliexpress e reautorize.',
          }, { status: 401 })
        }
      } else {
        console.error('[SYNC] ❌ Token expirado e sem refresh token. Reautorize em /admin/integracao/aliexpress.')
        return NextResponse.json({
          error: 'Token AliExpress expirado e sem refresh token. Reautorize em /admin/integracao/aliexpress.',
        }, { status: 401 })
      }
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
          selectedSkus: true,
          attributes: true,
          brand: true,
          model: true
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
      const apiResponse = await fetchAliExpressProduct(productId, auth.appKey, auth.appSecret, auth.accessToken as string)

      if (!apiResponse || apiResponse.skus.length === 0) {
        errors++
        results.push({ id: product.id, name: product.name, status: 'error', reason: 'API não retornou SKUs' })
        continue
      }

      const { skus: apiSkus, result: apiResult } = apiResponse

      // Criar mapa de preços/estoque da API por skuId
      const apiData: Record<string, { price: number, stock: number }> = {}
      let minApiPrice = Infinity

      for (const sku of apiSkus) {
        const skuId = String(sku.sku_id || sku.ae_sku_id || sku.id || '')
        // Arredondar para 2 casas decimais para evitar drift de câmbio (ex: 33.989999 → 33.99)
        const rawPrice = parseFloat(sku.offer_sale_price) || parseFloat(sku.sku_price) || 0
        const price = Math.round(rawPrice * 100) / 100
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
                
                const oldCostPrice = Math.round((Number(sku.costPrice) || 0) * 100) / 100
                const newCostPrice = api.price // já está arredondado para 2 casas
                
                // Margem do SKU - usar a do SKU, ou do produto, arredondada
                let margin = Number(sku.margin) || productMargin
                if (margin > 100) margin = 50
                margin = Math.round(margin)
                
                // Recalcular customPrice SOMENTE se o custo mudou significativamente (> R$0.10)
                // Isso evita recalcular por variações de centavos de câmbio
                let newCustomPrice = Number(sku.customPrice) || 0
                if (Math.abs(newCostPrice - oldCostPrice) > 0.10 && newCostPrice > 0) {
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
      const previousCostPrice = Math.round((Number(product.costPrice) || 0) * 100) / 100
      const totalStock = Object.values(apiData).reduce((sum: number, s: any) => sum + s.stock, 0)

      // Calcular menor custo e menor preço de venda a partir dos selectedSkus ativos (respeitando margem por SKU)
      let newCostPrice = minApiPrice !== Infinity ? minApiPrice : previousCostPrice
      let newPrice = Number(product.price)
      let priceChanged = false

      if (updatedSelectedSkus) {
        try {
          const updatedSelected: any[] = JSON.parse(updatedSelectedSkus)
          const activeSkus = updatedSelected.filter(s => s.enabled !== false)
          const skusToUse = activeSkus.length > 0 ? activeSkus : updatedSelected

          const customPrices = skusToUse
            .map(s => Number(s.customPrice))
            .filter(p => p > 0)
          const costPrices = skusToUse
            .map(s => Math.round((Number(s.costPrice) || 0) * 100) / 100)
            .filter(p => p > 0)

          if (customPrices.length > 0) {
            const minCustomPrice = Number(Math.min(...customPrices).toFixed(2))
            if (Math.abs(minCustomPrice - Number(product.price)) > 0.10) {
              newPrice = minCustomPrice
              priceChanged = true
            }
          }
          if (costPrices.length > 0) {
            newCostPrice = Number(Math.min(...costPrices).toFixed(2))
          }
        } catch { /* mantém valores calculados acima */ }
      }

      // Fallback: se não há selectedSkus, recalcular pelo menor preço da API + margem do produto
      if (!updatedSelectedSkus && minApiPrice !== Infinity) {
        const costMudou = Math.abs(newCostPrice - previousCostPrice) > 0.10
        if (costMudou) {
          newPrice = Number((newCostPrice * (1 + productMargin / 100)).toFixed(2))
          priceChanged = true
        }
      }

      // ========== ENRIQUECER ATRIBUTOS SE AUSENTES ==========
      let updatedAttributes: string | undefined
      let updatedBrand: string | undefined
      let updatedModel: string | undefined
      let attributesAdded = 0

      // Verificar se atributos já existem COM CONTEÚDO ÚTIL
      let hasAttributes = false
      const rawAttrStr = (product as any).attributes
      if (rawAttrStr && rawAttrStr !== '[]' && rawAttrStr !== 'null') {
        try {
          const parsed = JSON.parse(rawAttrStr)
          if (Array.isArray(parsed) && parsed.length >= 3) {
            // Tem 3 ou mais atributos no formato { nome, valor } → considera completo
            if (parsed[0].nome !== undefined) {
              hasAttributes = true
            }
          }
          // Se tem 0, 1 ou 2 atributos (ex: só "Nome da marca: other"), vai enriquecer
        } catch { /* parsing falhou, vai sobrescrever */ }
      }
      if (!hasAttributes) {
        const baseInfo = apiResult.ae_item_base_info_dto || {}
        const mobileDetail: string = baseInfo.mobile_detail || ''
        let specs: Array<{ nome: string; valor: string }> = []

        // Tentativa 1: mobile_detail (produtos de grandes marcas)
        if (mobileDetail) {
          specs = extractAttributesFromMobileDetail(mobileDetail)
          if (specs.length > 0) {
            console.log(`[SYNC] 📋 mobile_detail: ${specs.length} specs para ${product.name.substring(0, 30)}`)
          }
        }

        // Tentativa 2: ae_item_properties (sempre presente — pelo menos Marca e Modelo)
        if (specs.length === 0) {
          const propsRaw = apiResult.ae_item_properties?.ae_item_property
          if (propsRaw) {
            const propList: any[] = Array.isArray(propsRaw) ? propsRaw : [propsRaw]
            specs = propList
              .filter((p: any) => p.attr_name && p.attr_value)
              .map((p: any) => ({ nome: String(p.attr_name), valor: String(p.attr_value) }))
            if (specs.length > 0) {
              console.log(`[SYNC] 📋 ae_item_properties: ${specs.length} specs para ${product.name.substring(0, 30)}`)
            }
          }
        }

        if (specs.length > 0) {
          updatedAttributes = JSON.stringify(specs)
          attributesAdded = specs.length

          // Extrair marca e modelo
          for (const spec of specs) {
            const nameLower = spec.nome.toLowerCase()
            if (!updatedBrand && (nameLower.includes('marca') || nameLower.includes('brand') || nameLower.includes('nome da marca'))) {
              updatedBrand = spec.valor
            }
            if (!updatedModel && (nameLower.includes('referência') || nameLower.includes('modelo') || nameLower.includes('model') || nameLower.includes('número do modelo'))) {
              updatedModel = spec.valor
            }
          }
        } else {
          console.log(`[SYNC] ⚠️ Sem atributos disponíveis para ${product.name.substring(0, 30)}`)
        }
      }

      // ========== SALVAR NO BANCO ==========
      await prisma.product.update({
        where: { id: product.id },
        data: {
          costPrice: newCostPrice,
          ...(priceChanged ? { price: newPrice } : {}),
          stock: Math.min(product.stock || 999, totalStock),
          supplierStock: totalStock,
          lastSyncAt: new Date(),
          ...(updatedVariants && { variants: updatedVariants }),
          ...(updatedSelectedSkus && { selectedSkus: updatedSelectedSkus }),
          ...(updatedAttributes && { attributes: updatedAttributes }),
          ...(updatedBrand && { brand: updatedBrand }),
          ...(updatedModel && { model: updatedModel })
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
        totalStock,
        attributesAdded
      })

      console.log(`[SYNC] ✅ ${product.name.substring(0, 30)}: ${variantsUpdatedCount} variants, ${selectedUpdatedCount} selected, ${pricesRecalculated} preços recalculados${attributesAdded > 0 ? `, ${attributesAdded} atributos adicionados` : ''}`)
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
