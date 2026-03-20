import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-security'
import { PackagingService, PackagingResult } from '@/lib/packaging-service'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Função para gerar assinatura AliExpress
function generateAliExpressSign(params: Record<string, any>, appSecret: string): string {
  const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase()
}

// Parsear resposta JSON com segurança — loga o corpo bruto se não for JSON
async function safeJson(res: Response, label: string): Promise<any> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    const preview = text.slice(0, 300).replace(/\s+/g, ' ')
    console.error(`[AliExpress] ${label} retornou não-JSON (HTTP ${res.status}):`, preview)
    // Detectar causas comuns
    if (res.status === 401 || text.includes('Unauthorized')) {
      console.error(`[AliExpress] ⚠️ Token expirado ou inválido. Renove o accessToken no painel.`)
    } else if (res.status === 429 || text.toLowerCase().includes('rate limit') || text.toLowerCase().includes('too many')) {
      console.error(`[AliExpress] ⚠️ Rate limit atingido. Aguarde antes de tentar novamente.`)
    } else if (res.status === 403) {
      console.error(`[AliExpress] ⚠️ Acesso negado (403). Verifique app_key e permissões.`)
    }
    throw new Error(`AliExpress API (${label}) retornou HTTP ${res.status} com corpo não-JSON`)
  }
}

// Mapeamento de estados para nome válido do AliExpress (sem acentos)
const STATE_CODES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapa', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceara', 'DF': 'Distrito Federal', 'ES': 'Espirito Santo',
  'GO': 'Goias', 'MA': 'Maranhao', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Para', 'PB': 'Paraiba', 'PR': 'Parana',
  'PE': 'Pernambuco', 'PI': 'Piaui', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondonia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'Sao Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
}

// Função para buscar frete do AliExpress para produtos dropshipping
// Tenta até MAX_RETRIES vezes antes de desistir
async function getAliExpressShipping(
  product: any, 
  cep: string, 
  quantity: number,
  auth: any,
  attempt = 1
): Promise<{ success: boolean; options: any[]; error?: string }> {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 1500

  try {
    // Precisamos do SKU ID do produto
    // O supplierSku armazena o productId do AliExpress
    const productId = product.supplierSku
    if (!productId) {
      return { success: false, options: [], error: 'Product ID não encontrado' }
    }

    // Buscar primeiro SKU disponível do produto (chamada única com assinatura correta)
    const timestamp = Date.now().toString()
    const productParams: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.product.get',
      session: auth.accessToken,
      timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      product_id: productId,
      ship_to_country: 'BR',
      target_currency: 'BRL',
      target_language: 'pt',
    }
    productParams.sign = generateAliExpressSign(productParams, auth.appSecret)

    const productRes = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(productParams).toString()}`, { signal: AbortSignal.timeout(10000) })
    const productData = await safeJson(productRes, 'ds.product.get')

    let skuId = ''
    if (productData.aliexpress_ds_product_get_response?.result) {
      const result = productData.aliexpress_ds_product_get_response.result
      const skuList = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
      const skus = Array.isArray(skuList) ? skuList : [skuList]
      // Pegar primeiro SKU com estoque
      const availableSku = skus.find((s: any) => s.sku_available_stock > 0 || s.sku_stock)
      skuId = availableSku?.sku_id || skus[0]?.sku_id || ''
    }

    if (!skuId) {
      console.error(`[Frete Internacional] SKU não encontrado (tentativa ${attempt}/${MAX_RETRIES})`)
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
        return getAliExpressShipping(product, cep, quantity, auth, attempt + 1)
      }
      return { success: false, options: [], error: 'SKU não encontrado no AliExpress' }
    }

    // Buscar info do CEP para obter estado (com fallback para SP se ViaCEP estiver fora)
    let stateCode = 'SP'
    let provinceName = 'Sao Paulo'
    let cityName = 'Sao Paulo'
    let district = ''
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(4000) })
      const viaCepData = await safeJson(viaCepRes, 'viacep')
      stateCode = viaCepData.uf?.toUpperCase() || 'SP'
      provinceName = STATE_CODES[stateCode] || 'Sao Paulo'
      cityName = viaCepData.localidade || 'Sao Paulo'
      district = viaCepData.bairro || ''
    } catch (e: any) {
      console.warn('[ViaCEP] Falha ao buscar CEP, usando defaults SP:', e.message)
    }

    console.log('🌍 [Frete Internacional] CEP Info:', { cep, stateCode, provinceName, cityName, district })

    // Montar endereço para consulta de frete
    const addressObj = {
      country: 'BR',
      province: provinceName,
      city: cityName,
      district: district,
      zipCode: cep.replace(/\D/g, ''),
      addressLine1: 'Endereço',
      recipientName: 'Cliente'
    }

    const queryDeliveryReq = {
      productId: productId,
      quantity: quantity,
      shipToCountry: 'BR',
      address: JSON.stringify(addressObj),
      selectedSkuId: skuId,
      locale: 'pt_BR',
      language: 'pt_BR',
      currency: 'BRL',
    }

    console.log('🌍 [Frete Internacional] Request:', {
      productId,
      skuId,
      quantity,
      address: addressObj
    })

    const freightParams: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.freight.query',
      session: auth.accessToken,
      timestamp: Date.now().toString(),
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      queryDeliveryReq: JSON.stringify(queryDeliveryReq),
    }
    freightParams.sign = generateAliExpressSign(freightParams, auth.appSecret)

    const freightRes = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(freightParams).toString()}`)
    const freightData = await safeJson(freightRes, 'ds.freight.query')

    console.log('🌍 [Frete Internacional] Resposta API:', JSON.stringify(freightData, null, 2))

    const freightResult = freightData.aliexpress_ds_freight_query_response?.result
    if (!freightResult?.success) {
      const errMsg = freightResult?.msg || 'Erro ao consultar frete'
      console.error(`[Frete Internacional] Erro (tentativa ${attempt}/${MAX_RETRIES}):`, errMsg)
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
        return getAliExpressShipping(product, cep, quantity, auth, attempt + 1)
      }
      return { success: false, options: [], error: errMsg }
    }

    const deliveryOptions = freightResult.delivery_options?.delivery_option_d_t_o || []
    
    console.log('🌍 [Frete Internacional] Opções encontradas:', deliveryOptions.length)
    
    const options = deliveryOptions.map((opt: any) => ({
      name: opt.company || opt.code,
      price: parseFloat(opt.shipping_fee_cent || '0'),
      days: opt.delivery_date_desc || `${opt.min_delivery_days || 10}-${opt.max_delivery_days || 30} dias`,
      icon: '🌍',
      isFree: opt.free_shipping === true || parseFloat(opt.shipping_fee_cent || '0') === 0,
      isInternational: true,
      shipFrom: opt.ship_from_country || 'CN'
    }))

    console.log('🌍 [Frete Internacional] Opções processadas:', options)

    return { success: true, options }

  } catch (error: any) {
    console.error(`[AliExpress Frete] Erro (tentativa ${attempt}/${MAX_RETRIES}):`, error.message)
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
      return getAliExpressShipping(product, cep, quantity, auth, attempt + 1)
    }
    return { success: false, options: [], error: error.message }
  }
}

// Função para identificar estado pelo CEP
function getCepState(cep: string): string | null {
  const cepRanges: { [key: string]: string[][] } = {
    'SP': [['01000000', '19999999']],
    'RJ': [['20000000', '28999999']],
    'ES': [['29000000', '29999999']],
    'MG': [['30000000', '39999999']],
    'BA': [['40000000', '48999999']],
    'SE': [['49000000', '49999999']],
    'PE': [['50000000', '56999999']],
    'AL': [['57000000', '57999999']],
    'PB': [['58000000', '58999999']],
    'RN': [['59000000', '59999999']],
    'CE': [['60000000', '63999999']],
    'PI': [['64000000', '64999999']],
    'MA': [['65000000', '65999999']],
    'PA': [['66000000', '68899999']],
    'AP': [['68900000', '68999999']],
    'AM': [['69000000', '69299999'], ['69400000', '69899999']],
    'RR': [['69300000', '69399999']],
    'AC': [['69900000', '69999999']],
    'DF': [['70000000', '72799999'], ['73000000', '73699999']],
    'GO': [['72800000', '72999999'], ['73700000', '76799999']],
    'TO': [['77000000', '77999999']],
    'MT': [['78000000', '78899999']],
    'RO': [['76800000', '76999999']],
    'MS': [['79000000', '79999999']],
    'PR': [['80000000', '87999999']],
    'SC': [['88000000', '89999999']],
    'RS': [['90000000', '99999999']]
  }

  const cleanCep = cep.replace(/\D/g, '')
  const cepNum = parseInt(cleanCep)

  for (const [state, ranges] of Object.entries(cepRanges)) {
    for (const [min, max] of ranges) {
      if (cepNum >= parseInt(min) && cepNum <= parseInt(max)) {
        return state
      }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    // 🔐 Validar API Key
    const apiKey = req.headers.get('x-api-key')
    const validation = await validateApiKey(apiKey)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'API Key inválida' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { cep, cartValue, weight: bodyWeight, products, items } = body

    if (!cep) {
      return NextResponse.json(
        { message: 'CEP é obrigatório' },
        { status: 400 }
      )
    }

    // Limpar CEP
    const cleanCep = cep.replace(/\D/g, '')

    // Calcular peso e dimensões dos produtos usando o serviço de empacotamento
    let packagingResult: PackagingResult | null = null
    let totalWeight = bodyWeight || 0.3
    let totalLength = 20
    let totalWidth = 15
    let totalHeight = 10

    // ========================================
    // 🌍 VERIFICAR SE É PRODUTO DE DROPSHIPPING (FORNECEDOR EXTERNO)
    // ========================================
    // LÓGICA SIMPLES:
    // - Se produto tem supplierId (fornecedor) → usa frete do fornecedor
    // - Se produto NÃO tem supplierId (próprio) → usa regras nacionais
    let isDropshippingProduct = false
    let dropshippingProduct: any = null
    let hasOwnProducts = false  // Tem produtos próprios no carrinho

    // Usar products OU items (checkout envia items)
    const productList = products || items || []

    if (productList && Array.isArray(productList) && productList.length > 0) {
      // Buscar dados completos dos produtos no banco
      const cartProducts = []
      
      for (const item of productList) {
        const productId = item.id || item.productId
        if (!productId) continue

        const cleanProductId = productId.split('_')[0]
        const quantity = item.quantity || 1

        const product = await prisma.product.findUnique({
          where: { id: cleanProductId },
          include: { 
            supplier: true,
            category: true,
            seller: true  // Incluir vendedor para CEP de origem
          }
        })

        if (product) {
          // ========================================
          // 📦 LÓGICA SIMPLIFICADA DE FRETE:
          // ========================================
          // 1. Se tem supplierId → é dropshipping (usa frete do fornecedor)
          // 2. Se shipFromCountry != null e != 'BR' → é internacional
          // 3. Caso contrário → é produto próprio (usa Correios/Jadlog/etc)
          
          const hasSupplier = !!product.supplierId && !!product.supplier
          const isFromAbroad = product.shipFromCountry && product.shipFromCountry !== 'BR'
          
          // Verificar tipo do fornecedor
          const supplierType = product.supplier?.type?.toLowerCase() || ''
          const supplierName = product.supplier?.name?.toLowerCase() || ''
          const isAliExpressSupplier = (
            supplierType === 'aliexpress' ||
            supplierName.includes('aliexpress') ||
            product.supplierUrl?.toLowerCase()?.includes('aliexpress.com')
          )
          
          // É dropshipping se: tem fornecedor E (é do exterior OU fornecedor é AliExpress)
          if (hasSupplier && (isFromAbroad || isAliExpressSupplier)) {
            isDropshippingProduct = true
            dropshippingProduct = { ...product, quantity }
            console.log('📦 [Frete DROP] Produto de dropshipping detectado:', product.name)
            console.log('   - Fornecedor:', product.supplier?.name)
            console.log('   - Tipo:', product.supplier?.type)
            console.log('   - País origem:', product.shipFromCountry || 'não definido')
            console.log('   - SKU:', product.supplierSku)
          } else {
            // Produto próprio ou de vendedor nacional
            hasOwnProducts = true
            console.log('📦 [Frete PRÓPRIO] Produto próprio/nacional:', product.name)
          }

          // Determinar origem do produto para cálculo de frete
          let origemId = 'ADM' // Padrão: origem da ADM
          let cepOrigem: string | null = null
          
          if (product.sellerId && product.seller?.cep) {
            // Produto de vendedor - usar CEP do vendedor
            origemId = `SELLER_${product.sellerId}`
            cepOrigem = product.seller.cep
          }
          // DROP e ADM usam o CEP da ADM (configuração do sistema)

          cartProducts.push({
            id: product.id,
            name: product.name,
            quantity,
            weight: product.weight || 0.3,
            length: product.length || 16,
            width: product.width || 11,
            height: product.height || 5,
            origemId,
            cepOrigem,
            sellerId: product.sellerId || null,
            isDropshipping: product.isDropshipping || false,
          })
        } else {
          // Produto não encontrado, usar valores padrão
          cartProducts.push({
            id: cleanProductId,
            name: `Produto ${cleanProductId}`,
            quantity,
            weight: 0.3,
            length: 16,
            width: 11,
            height: 5
          })
        }
      }

      // ========================================
      // 📦 SE FOR PRODUTO DE DROPSHIPPING, BUSCAR FRETE DO FORNECEDOR
      // ========================================
      if (isDropshippingProduct && dropshippingProduct && !hasOwnProducts) {
        console.log('📦 [Frete DROP] Buscando opções de frete do fornecedor...')
        
        // Buscar credenciais do AliExpress
        const auth = await prisma.aliExpressAuth.findFirst()
        
        if (auth?.accessToken) {
          const aliShipping = await getAliExpressShipping(
            dropshippingProduct,
            cleanCep,
            dropshippingProduct.quantity || 1,
            auth
          )

          if (aliShipping.success && aliShipping.options.length > 0) {
            // Ordenar opções por preço
            aliShipping.options.sort((a: any, b: any) => a.price - b.price)
            const cheapest = aliShipping.options[0]

            console.log('✅ [Frete DROP] Opções encontradas:', aliShipping.options.length)

            const shipFromCountry = dropshippingProduct.shipFromCountry || 'CN'
            const isFromBrazil = shipFromCountry === 'BR'

            // Mapear nomes para não expor plataforma
            const mapShippingName = (name: string): string => {
              const nameLower = name.toLowerCase()
              if (nameLower.includes('express') || nameLower.includes('fast')) {
                return 'Envio Expresso'
              } else if (nameLower.includes('standard') || nameLower.includes('selection')) {
                return 'Envio Padrão'
              } else if (nameLower.includes('economy') || nameLower.includes('econom')) {
                return 'Envio Econômico'
              } else if (nameLower.includes('priority')) {
                return 'Envio Prioritário'
              }
              return 'Logística MydShop Express'
            }

            return NextResponse.json({
              shippingCost: cheapest.price,
              deliveryDays: cheapest.days,
              isFree: cheapest.isFree,
              message: cheapest.isFree ? 'Frete Grátis' : undefined,
              shippingMethod: 'dropshipping',
              shippingService: mapShippingName(cheapest.name),
              shippingCarrier: dropshippingProduct.supplier?.name || 'Fornecedor Externo',
              isInternational: !isFromBrazil,
              shipFrom: shipFromCountry,
              // Todas as opções disponíveis (sem expor nome da plataforma)
              allOptions: aliShipping.options.map((opt: any) => ({
                name: mapShippingName(opt.name),
                price: opt.price,
                days: opt.days,
                icon: isFromBrazil ? '📦' : '🌍',
                isFree: opt.isFree,
                isInternational: !isFromBrazil
              }))
            })
          } else {
            console.error('❌ [Frete DROP] API não retornou opções após todas as tentativas:', aliShipping.error)
            return NextResponse.json(
              { error: 'Não foi possível calcular o frete agora. Tente novamente em instantes.' },
              { status: 503 }
            )
          }
        }

        // Sem credenciais do AliExpress configuradas
        console.error('❌ [Frete DROP] Credenciais AliExpress não configuradas')
        return NextResponse.json(
          { error: 'Serviço de frete temporariamente indisponível. Tente novamente.' },
          { status: 503 }
        )
      }

      // Usar serviço de empacotamento inteligente
      if (cartProducts.length > 0) {
        // ========================================
        // 📦 AGRUPAR PRODUTOS POR ORIGEM DE ENVIO
        // ========================================
        const gruposPorOrigem = new Map<string, typeof cartProducts>()
        
        for (const prod of cartProducts) {
          const origemId = prod.origemId || 'ADM'
          if (!gruposPorOrigem.has(origemId)) {
            gruposPorOrigem.set(origemId, [])
          }
          gruposPorOrigem.get(origemId)!.push(prod)
        }
        
        console.log(`📦 [Frete] ${gruposPorOrigem.size} origem(s) de envio detectada(s):`)
        for (const [origemId, prods] of gruposPorOrigem.entries()) {
          const cepOrigem = prods[0]?.cepOrigem || 'ADM'
          console.log(`   - ${origemId}: ${prods.length} produto(s) | CEP origem: ${cepOrigem}`)
        }
        
        packagingResult = await PackagingService.selectBestPackaging(cartProducts)
        
        if (packagingResult.packaging) {
          totalWeight = packagingResult.packaging.totalWeight
          totalLength = packagingResult.packaging.outerLength
          totalWidth = packagingResult.packaging.outerWidth
          totalHeight = packagingResult.packaging.outerHeight
          
          console.log(`📦 Embalagem selecionada: ${packagingResult.packaging.name}`)
          console.log(`   Peso total: ${totalWeight}kg | Dim: ${totalLength}x${totalWidth}x${totalHeight}cm`)
          console.log(`   Peso volumétrico: ${packagingResult.packaging.volumetricWeight.toFixed(2)}kg`)
          console.log(`   Utilização: ${packagingResult.debug.utilizationPercent}%`)
        }
      }
    }

    // Peso mínimo para Correios
    if (totalWeight < 0.3) totalWeight = 0.3
    if (totalLength < 16) totalLength = 16
    if (totalWidth < 11) totalWidth = 11
    if (totalHeight < 2) totalHeight = 2

    console.log(`📦 Frete: CEP=${cep} | Peso=${totalWeight}kg | Dim=${totalLength}x${totalWidth}x${totalHeight}cm`)

    // Buscar regras ativas ordenadas por prioridade
    const rules = await prisma.shippingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    })

    if (rules.length === 0) {
      return NextResponse.json({
        shippingCost: 0,
        deliveryDays: 7,
        isFree: true,
        message: 'Frete grátis',
        // Campos de transportadora
        shippingMethod: 'propria',
        shippingService: 'Frete Grátis',
        shippingCarrier: 'Entrega Própria'
      })
    }

    // cleanCep já foi definido acima
    console.log('🔍 Calculando frete para CEP:', cleanCep, '| Carrinho:', cartValue, '| Peso:', totalWeight)

    // Coletar informações sobre promoções/requisitos mínimos
    let promoInfo: { minValue: number; ruleName: string } | null = null

    // Tentar encontrar regra que se aplica
    for (const rule of rules) {
      console.log(`📋 Testando regra: ${rule.name} (${rule.regionType})`)
      
      // Verificar se a região aplica primeiro (para coletar info de promoção relevante)
      let matchesRegion = false
      try {
        const regions = JSON.parse(rule.regions)
        if (rule.regionType === 'NATIONWIDE') {
          matchesRegion = true
        } else if (rule.regionType === 'STATE') {
          const estadoCep = getCepState(cleanCep)
          matchesRegion = !!estadoCep && regions.includes(estadoCep)
        } else if (rule.regionType === 'ZIPCODE_RANGE') {
          const cepNum = parseInt(cleanCep)
          matchesRegion = regions.some((range: any) => {
            const [min, max] = range.split('-').map((c: string) => parseInt(c.replace(/\D/g, '')))
            return cepNum >= min && cepNum <= max
          })
        } else if (rule.regionType === 'CITY') {
          matchesRegion = true
        }
      } catch (e) {
        matchesRegion = rule.regionType === 'NATIONWIDE'
      }

      // Se a região aplica mas o valor não atinge o mínimo, guardar info
      if (matchesRegion && rule.minCartValue && cartValue < rule.minCartValue) {
        if (!promoInfo || rule.minCartValue < promoInfo.minValue) {
          promoInfo = { minValue: rule.minCartValue, ruleName: rule.name }
        }
      }

      // Verificar restrições de valor do carrinho
      if (rule.minCartValue && cartValue < rule.minCartValue) {
        console.log(`❌ Carrinho R$${cartValue} < mínimo R$${rule.minCartValue}`)
        continue
      }
      if (rule.maxCartValue && cartValue > rule.maxCartValue) {
        console.log(`❌ Carrinho R$${cartValue} > máximo R$${rule.maxCartValue}`)
        continue
      }

      // Verificar restrições de peso
      if (rule.minWeight && totalWeight < rule.minWeight) {
        console.log(`❌ Peso ${totalWeight}kg < mínimo ${rule.minWeight}kg`)
        continue
      }
      if (rule.maxWeight && totalWeight > rule.maxWeight) {
        console.log(`❌ Peso ${totalWeight}kg > máximo ${rule.maxWeight}kg`)
        continue
      }

      // Já verificamos matchesRegion acima, só precisamos logar
      if (!matchesRegion) {
        console.log('❌ Região não corresponde')
        continue
      }
      
      console.log('✅ Regra aplicável encontrada!')

      // Regra encontrada! Calcular custo
      let shippingCost = rule.shippingCost

      // Adicionar custo por peso
      if (rule.costPerKg && totalWeight) {
        shippingCost += rule.costPerKg * totalWeight
      }

      // Verificar frete grátis
      if (rule.freeShippingMin && cartValue >= rule.freeShippingMin) {
        return NextResponse.json({
          shippingCost: 0,
          deliveryDays: rule.deliveryDays,
          isFree: true,
          message: `Frete grátis! (compra acima de R$ ${rule.freeShippingMin.toFixed(2)})`,
          packaging: packagingResult?.packaging || null,
          // Campos de transportadora
          shippingMethod: 'propria',
          shippingService: 'Frete Grátis',
          shippingCarrier: 'Entrega Própria'
        })
      }

      return NextResponse.json({
        shippingCost: parseFloat(shippingCost.toFixed(2)),
        deliveryDays: rule.deliveryDays,
        isFree: false,
        ruleName: rule.name,
        packaging: packagingResult?.packaging || null,
        // Campos de transportadora
        shippingMethod: 'propria',
        shippingService: rule.name,
        shippingCarrier: 'Entrega Própria'
      })
    }

    // Nenhuma regra se aplicou, tentar consultar Correios
    console.log('\n📋 === DIAGNÓSTICO DE FRETE ====')
    console.log(`📍 CEP Destino: ${cleanCep}`)
    console.log(`📦 Peso Total: ${totalWeight}kg`)
    console.log(`📏 Dimensões: ${totalLength}x${totalWidth}x${totalHeight}cm`)
    console.log(`💵 Valor do Carrinho: R$ ${cartValue}`)
    
    const correiosConfig = await prisma.systemConfig.findFirst({
      where: { key: 'correios.enabled' }
    })
    
    const cepOrigemConfig = await prisma.systemConfig.findFirst({
      where: { key: 'correios.cepOrigem' }
    })
    
    const percentualConfig = await prisma.systemConfig.findFirst({
      where: { key: 'correios.percentualExtra' }
    })

    console.log(`\n⚙️ Configuração Correios:`);
    console.log(`   - Habilitado: ${correiosConfig?.value === 'true' ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   - CEP Origem: ${cepOrigemConfig?.value || '❌ NÃO CONFIGURADO'}`);
    console.log(`   - Percentual Extra: ${percentualConfig?.value || '0'}%`);

    if (correiosConfig?.value !== 'true') {
      console.log('\n⛔ FALLBACK: Correios desabilitado')
    } else if (!cepOrigemConfig?.value) {
      console.log('\n⛔ FALLBACK: CEP origem não configurado')
    } else if (totalWeight <= 0) {
      console.log('\n⛔ FALLBACK: Peso total inválido')
    } else if (totalLength <= 0 || totalWidth <= 0 || totalHeight <= 0) {
      console.log('\n⛔ FALLBACK: Dimensões inválidas')
    } else {
      try {
        console.log('\n🚀 Consultando Correios para frete...')
        
        // Fazer requisição interna para API dos Correios
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL_INTERNAL || 'http://localhost:3000'
        const correiosUrl = `${baseUrl}/api/shipping/correios`
        const correiosPayload = {
          cepOrigem: cepOrigemConfig.value,
          cepDestino: cleanCep,
          peso: totalWeight,
          comprimento: totalLength,
          altura: totalHeight,
          largura: totalWidth,
          valor: cartValue
        }
        
        console.log(`📤 Request para ${correiosUrl}:`, JSON.stringify(correiosPayload, null, 2))
        
        const correiosResponse = await fetch(correiosUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(correiosPayload),
          signal: AbortSignal.timeout(15000) // 15s timeout
        })

        console.log(`📥 Response Status: ${correiosResponse.status}`)
        
        if (correiosResponse.ok) {
          const correiosData = await safeJson(correiosResponse, 'correios-quote')
          console.log(`📊 Dados Correios recebidos:`, JSON.stringify(correiosData, null, 2))
          
          // Pegar todos os resultados válidos sem erro
          const todosResultados = correiosData.resultados || []
          const resultadosValidos = todosResultados.filter((r: any) => !r.erro && r.valor > 0)
          
          console.log(`   - Total de resultados: ${todosResultados.length}`)
          console.log(`   - Resultados válidos: ${resultadosValidos.length}`)
          
          if (todosResultados.length > 0) {
            todosResultados.forEach((r: any, i: number) => {
              console.log(`   [${i}] ${r.servico}: R$ ${r.valor} (${r.prazo}d) ${r.erro ? `⚠️ ERRO: ${r.erro}` : '✅'}`)
            })
          }
          
          if (resultadosValidos.length > 0) {
            // Ordenar por valor (mais barato primeiro)
            resultadosValidos.sort((a: any, b: any) => a.valor - b.valor)
            const maisBarato = resultadosValidos[0]
            
            // Mostrar todas as opções no log
            console.log(`\n✅ SUCESSO! Usando frete dos Correios:`)
            resultadosValidos.forEach((r: any) => {
              console.log(`   - ${r.servico}: R$ ${r.valor} (${r.prazo} dias)`)
            })
            
            // Mapear todas as opções para o cliente escolher
            const shippingOptions = resultadosValidos.map((r: any) => ({
              id: `correios_${r.servico.toLowerCase().replace(/\s+/g, '_')}`,
              name: r.servico,
              price: r.valor,
              deliveryDays: r.prazo,
              carrier: 'Correios',
              method: 'correios',
              service: r.servico
            }))
            
            return NextResponse.json({
              shippingCost: maisBarato.valor,
              deliveryDays: maisBarato.prazo,
              isFree: false,
              message: `Via Correios`,
              packaging: packagingResult?.packaging || null,
              // Campos de transportadora (opção mais barata como padrão)
              shippingMethod: 'correios',
              shippingService: maisBarato.servico,
              shippingCarrier: 'Correios',
              // TODAS as opções de frete para o cliente escolher
              shippingOptions,
              // Info de promoção
              promo: promoInfo ? {
                minValue: promoInfo.minValue,
                missing: parseFloat((promoInfo.minValue - cartValue).toFixed(2)),
                ruleName: promoInfo.ruleName
              } : null
            })
          } else {
            console.log('\n⚠️ ERROR: Nenhum resultado válido dos Correios')
            return NextResponse.json(
              { error: 'Não foi possível calcular o frete para o endereço informado.' },
              { status: 422 }
            )
          }
        } else {
          console.log(`\n⚠️ ERROR: HTTP ${correiosResponse.status} na API Correios`)
          const errorBody = await correiosResponse.text()
          console.log(`   Body: ${errorBody.slice(0, 500)}`)
          return NextResponse.json(
            { error: 'Não foi possível calcular o frete para o endereço informado.' },
            { status: 502 }
          )
        }
      } catch (correiosError: any) {
        console.error(`\n❌ ERROR: Erro ao consultar Correios: ${correiosError.message}`)
        console.error(`   Stack: ${correiosError.stack?.split('\n')[0]}`)
        return NextResponse.json(
          { error: 'Não foi possível calcular o frete no momento. Tente novamente mais tarde.' },
          { status: 503 }
        )
      }
    }

    // Se chegou até aqui, nenhuma estratégia gerou frete
    console.log('\n❌ ERRO: Sem opções de frete disponíveis para o carrinho/cep informado')
    return NextResponse.json(
      { error: 'Entrega não disponível para o endereço informado. Entre em contato com a administração.' },
      { status: 422 }
    )

  } catch (error) {
    console.error('Erro ao calcular frete:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular frete' },
      { status: 500 }
    )
  }
}
