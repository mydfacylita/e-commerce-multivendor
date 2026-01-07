import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Enviar pedido ao fornecedor (Shopify ou outro com API)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json(
        { message: 'ID do pedido não fornecido' },
        { status: 400 }
      )
    }

    // Buscar pedido com itens e produtos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                supplier: true,
              },
            },
          },
        },
        user: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { message: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    if (order.sentToSupplier) {
      return NextResponse.json(
        { message: 'Pedido já foi enviado ao fornecedor' },
        { status: 400 }
      )
    }

    // Agrupar itens por fornecedor
    const itemsBySupplier = new Map<string, any[]>()

    for (const item of order.items) {
      if (!item.product.supplierId) continue

      const supplierId = item.product.supplierId
      if (!itemsBySupplier.has(supplierId)) {
        itemsBySupplier.set(supplierId, [])
      }
      itemsBySupplier.get(supplierId)!.push(item)
    }

    const results = []

    // Enviar pedido para cada fornecedor
    for (const [supplierId, items] of itemsBySupplier) {
      const supplier = items[0].product.supplier

      console.log(`[Pedido ${orderId}] Processando fornecedor:`, {
        id: supplier.id,
        name: supplier.name,
        hasAPI: !!(supplier.apiUrl && supplier.apiKey),
      })

      // Verificar se é AliExpress pelo nome (mesmo sem API configurada)
      const isAliExpress = supplier.name?.toLowerCase().includes('aliexpress')

      if ((supplier.apiUrl && supplier.apiKey) || isAliExpress) {
        // Fornecedor com API ou AliExpress - enviar automaticamente
        try {
          const supplierOrderId = await sendToSupplierAPI(
            supplier,
            order,
            items
          )
          console.log(`[Pedido ${orderId}] Sucesso no fornecedor ${supplier.name}:`, supplierOrderId)
          results.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            status: 'sent',
            supplierOrderId,
          })
        } catch (error: any) {
          console.error(`[Pedido ${orderId}] Erro no fornecedor ${supplier.name}:`, error.message)
          results.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            status: 'error',
            error: error.message,
          })
        }
      } else {
        // Fornecedor sem API - marcar como manual
        console.log(`[Pedido ${orderId}] Fornecedor ${supplier.name} requer envio manual`)
        results.push({
          supplierId: supplier.id,
          supplierName: supplier.name,
          status: 'manual',
          message: 'Enviar pedido manualmente para este fornecedor',
        })
      }
    }

    // Atualizar pedido como enviado
    await prisma.order.update({
      where: { id: orderId },
      data: {
        sentToSupplier: true,
        sentToSupplierAt: new Date(),
        status: 'PROCESSING',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Pedido enviado aos fornecedores',
      results,
    })
  } catch (error: any) {
    console.error('Erro ao enviar pedido:', error)
    return NextResponse.json(
      { message: error.message || 'Erro ao enviar pedido' },
      { status: 500 }
    )
  }
}

/**
 * Enviar pedido para API do fornecedor (Shopify)
 */
async function sendToSupplierAPI(
  supplier: any,
  order: any,
  items: any[]
): Promise<string> {
  // Verificar se algum produto é Choice/Selection
  const choiceProducts = items.filter(item => item.product.isChoiceProduct)
  if (choiceProducts.length > 0) {
    const productNames = choiceProducts.map(item => item.product.name).join(', ')
    throw new Error(
      `⚠️ PRODUTOS ALIEXPRESS CHOICE DETECTADOS!\n\n` +
      `Os seguintes produtos são "AliExpress Choice/Selection" e NÃO funcionam com a API de Dropshipping:\n` +
      `${productNames}\n\n` +
      `SOLUÇÕES:\n` +
      `1. Substituir por produtos regulares (sem badge Choice)\n` +
      `2. Fazer pedido manual no AliExpress\n` +
      `3. Usar fornecedor diferente\n\n` +
      `Produtos Choice têm logística integrada e não suportam dropship via API.`
    )
  }

  // Se for AliExpress dropshipping, usar API do AliExpress
  if (supplier.name?.toLowerCase().includes('aliexpress') || supplier.apiUrl?.includes('aliexpress')) {
    return await sendToAliExpress(supplier, order, items)
  }

  // Se for Shopify, usar API do Shopify
  if (supplier.apiUrl?.includes('myshopify.com')) {
    return await sendToShopify(supplier, order, items)
  }

  // Fornecedor genérico com API
  try {
    const response = await fetch(supplier.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supplier.apiKey}`,
      },
      body: JSON.stringify({
        shipping_address: order.shippingAddress,
        items: items.map((item) => ({
          sku: item.product.supplierSku,
          quantity: item.quantity,
          product_name: item.product.name,
        })),
        reference_id: order.id,
        marketplace: order.marketplaceName,
        marketplace_order_id: order.marketplaceOrderId,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro na API do fornecedor: ${error}`)
    }

    const data = await response.json()
    return data.order_id || data.id || 'SENT'
  } catch (error: any) {
    throw new Error(`Falha ao enviar ao fornecedor: ${error.message}`)
  }
}

/**
 * Enviar pedido para AliExpress Dropshipping
 * Usa a API aliexpress.ds.order.create (Dropshipping API)
 */
async function sendToAliExpress(
  supplier: any,
  order: any,
  items: any[]
): Promise<string> {
  try {
    console.log('[AliExpress DS] Iniciando criação de pedido dropshipping')
    
    // Buscar credenciais do AliExpress
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      throw new Error('Credenciais AliExpress não configuradas ou access token ausente')
    }

    const crypto = require('crypto')
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Preparar informações do pedido
    const productInfo = items.map((item) => ({
      product_id: item.product.supplierSku,
      product_count: item.quantity,
      sku_attr: '', // SKU attribute (ex: "14:10#Blue-A")
    }))

    // Validar se os produtos têm IDs válidos
    const invalidProducts = productInfo.filter(p => !p.product_id)
    if (invalidProducts.length > 0) {
      throw new Error(
        'Produtos sem SKU do fornecedor. ' +
        'Certifique-se de que os produtos têm o campo "supplierSku" preenchido com o ID do produto do AliExpress.'
      )
    }

    // Verificar se o produto está disponível na lista DS
    const productCheckResult = await verifyProductForDropshipping(
      auth.appKey,
      auth.appSecret,
      auth.accessToken,
      productInfo[0].product_id
    )

    if (!productCheckResult.available) {
      throw new Error(
        `Produto ${productInfo[0].product_id} não está na sua lista de dropshipping. ` +
        `Motivo: ${productCheckResult.reason}. ` +
        'Adicione o produto à sua lista DS primeiro em ds.aliexpress.com'
      )
    }

    // Pegar sku_attr retornado da verificação
    if (productCheckResult.skuInfo && productCheckResult.skuInfo.sku_attr) {
      productInfo[0].sku_attr = String(productCheckResult.skuInfo.sku_attr)
      console.log('[AliExpress DS] ✅ SKU Attr:', productInfo[0].sku_attr)
      console.log('[AliExpress DS] ✅ Estoque:', productCheckResult.skuInfo.stock)
    } else {
      console.warn('[AliExpress DS] ⚠️ Produto sem sku_attr - Pode ser produto sem variações')
    }

    const shippingInfo = parseShippingAddress(order.shippingAddress)

    // Buscar telefone: prioriza dados do pedido (checkout/marketplace), depois do cadastro
    const userPhone = order.buyerPhone || order.user?.phone || shippingInfo.phone || ''
    
    // Validar telefone obrigatório
    if (!userPhone || userPhone.trim() === '') {
      throw new Error(
        'Telefone do cliente é obrigatório para pedidos AliExpress. ' +
        'Por favor, informe o telefone do cliente no checkout ou atualize o cadastro.'
      )
    }
    
    // Validar CPF obrigatório para entregas no Brasil
    const userCpf = order.buyerCpf || order.user?.cpf || ''
    if (!userCpf || userCpf.trim() === '') {
      throw new Error(
        'CPF do cliente é obrigatório para entregas no Brasil via AliExpress. ' +
        'Por favor, informe o CPF do cliente no checkout ou atualize o cadastro.'
      )
    }

    // IMPORTANTE: Consultar métodos de frete disponíveis ANTES de criar o pedido
    // A API aliexpress.ds.order.create exige um método de frete válido
    // Parâmetros para consulta de frete
    const freightQueryData: any = {
      quantity: productInfo[0].product_count.toString(),
      shipToCountry: 'BR',
      productId: productInfo[0].product_id,
      language: 'en_US',
      currency: 'BRL',
      locale: 'pt_BR',
    }
    
    // Não usar selectedSkuId por enquanto - causa erro de parâmetro obrigatório
    // if (skuIdToUse) freightQueryData.selectedSkuId = skuIdToUse
    if (shippingInfo.provinceCode) freightQueryData.provinceCode = shippingInfo.provinceCode
    if (shippingInfo.city) freightQueryData.cityCode = shippingInfo.city

    const freightParams: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.freight.query',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      queryDeliveryReq: JSON.stringify(freightQueryData),
    }

    // Gerar assinatura
    const freightSign = generateAliExpressSign(freightParams, auth.appSecret)
    freightParams.sign = freightSign

    const freightUrl = `${apiUrl}?${new URLSearchParams(freightParams).toString()}`
    
    // Lista de métodos de frete para tentar (em ordem de prioridade)
    const fallbackMethods = [
      'CAINIAO_STANDARD',
      'CAINIAO_ECONOMY', 
      'AliExpress Saver Shipping',
      'AliExpress Standard Shipping',
      'ePacket'
    ]
    
    let logisticsServiceName: string = fallbackMethods[0] // Usar primeiro fallback por padrão
    
    try {
      const freightResponse = await fetch(freightUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const freightData = await freightResponse.json()
      
      // Log completo apenas se houver erro
      const result = freightData.aliexpress_ds_freight_query_response?.result
      if (!result?.success) {
        console.log('[AliExpress DS] Resposta ERRO frete:', JSON.stringify(freightData, null, 2))
      }

      // Extrair método de frete da resposta
      if (result?.success) {
        const deliveryOptions = result.delivery_options?.delivery_option_d_t_o || []
        
        if (Array.isArray(deliveryOptions) && deliveryOptions.length > 0) {
          console.log('[AliExpress DS] ========================================')
          console.log('[AliExpress DS] TODAS AS OPÇÕES DE FRETE DISPONÍVEIS:')
          deliveryOptions.forEach((opt, idx) => {
            console.log(`  ${idx + 1}. ${opt.code} - ${opt.company}`)
            console.log(`     Custo: ${opt.shipping_fee_format || opt.shipping_fee_cent}`)
            console.log(`     Grátis: ${opt.free_shipping}`)
            console.log(`     Prazo: ${opt.delivery_date_desc}`)
          })
          console.log('[AliExpress DS] ========================================')
          
          // Ordenar por custo (priorizar opções mais baratas/grátis)
          deliveryOptions.sort((a, b) => {
            const costA = parseFloat(a.shipping_fee_cent || '999999')
            const costB = parseFloat(b.shipping_fee_cent || '999999')
            return costA - costB
          })
          
          const firstOption = deliveryOptions[0]
          // Usar company ao invés de code para produtos Selection
          logisticsServiceName = firstOption.company || firstOption.code || fallbackMethods[0]
          
          // Determinar se frete é grátis
          let isFreeShipping = false
          if (firstOption.free_shipping === true) {
            isFreeShipping = true
          } else if (firstOption.mayHavePFS === true) {
            const threshold = parseFloat(firstOption.free_shipping_threshold || '0')
            if (threshold === 0) {
              isFreeShipping = true
            }
            // TODO: verificar se valor do pedido atinge threshold
          }
          
          console.log('[AliExpress DS] ✅ Método frete:', logisticsServiceName)
          console.log('[AliExpress DS] Empresa:', firstOption.company)
          console.log('[AliExpress DS] Custo:', isFreeShipping ? 'GRÁTIS' : (firstOption.shipping_fee_format || firstOption.shipping_fee_cent))
          console.log('[AliExpress DS] Prazo:', firstOption.delivery_date_desc || `${firstOption.min_delivery_days}-${firstOption.max_delivery_days} dias`)
        } else {
          console.warn('[AliExpress DS] ⚠️ Array de métodos vazio. Usando fallback:', logisticsServiceName)
        }
      } else {
        const errorCode = result?.code || 'N/A'
        const errorMsg = result?.msg || freightData.error_response?.msg || 'Erro desconhecido'
        console.warn(`[AliExpress DS] ⚠️ Erro frete [${errorCode}]: ${errorMsg}. Usando fallback: ${logisticsServiceName}`)
      }
    } catch (error) {
      console.warn('[AliExpress DS] ⚠️ Exceção ao consultar frete:', error, '. Usando fallback:', logisticsServiceName)
    }

    // Criar o pedido com a API aliexpress.ds.order.create
    const placeOrderRequest: any = {
      product_items: productInfo.map(item => {
        const productItem: any = {
          product_id: String(item.product_id), // ID do produto (obrigatório)
          product_count: Number(item.product_count), // Quantidade (obrigatório)
        }
        
        // Usar sku_attr para produtos com variações (obrigatório se produto tem variações)
        if (item.sku_attr && item.sku_attr.trim() !== '') {
          productItem.sku_attr = String(item.sku_attr) // Ex: "14:10#Blue-A"
          console.log('[AliExpress DS] 📦 Produto com SKU:', item.sku_attr)
        } else {
          console.log('[AliExpress DS] 📦 Produto sem variação (sem sku_attr)')
        }
        
        return productItem
      }),
      logistics_address: {
        address: shippingInfo.street || shippingInfo.address1,
        address2: shippingInfo.complement || shippingInfo.address2,
        city: shippingInfo.city,
        contact_person: order.user.name,
        country: 'Brazil',
        cpf: order.user.cpf || '',
        county: shippingInfo.district || '',
        full_name: order.user.name,
        locale: 'pt_BR',
        mobile_no: userPhone,
        phone_country: '55',
        province: shippingInfo.provinceName || 'Maranhao',
        street_number: shippingInfo.streetNumber || 'SN',
        zip: shippingInfo.zip,
      },
    }
    
    // SEMPRE incluir o método retornado pela consulta de frete
    if (logisticsServiceName && logisticsServiceName.trim() !== '') {
      placeOrderRequest.logistics_service_name = logisticsServiceName
    } else {
      // Se não conseguiu método válido, usar o primeiro fallback
      placeOrderRequest.logistics_service_name = fallbackMethods[0]
      console.log('[AliExpress DS] Usando método fallback:', fallbackMethods[0])
    }

    const orderParams: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.order.create',
      session: auth.accessToken,
      timestamp: Date.now().toString(), // Novo timestamp
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      param_place_order_request4_open_api_d_t_o: JSON.stringify(placeOrderRequest),
    }

    // Gerar assinatura
    const sign = generateAliExpressSign(orderParams, auth.appSecret)
    orderParams.sign = sign

    console.log('[AliExpress DS] Criando pedido com parâmetros:', {
      method: orderParams.method,
      param_place_order_request4_open_api_d_t_o: placeOrderRequest,
    })

    const url = `${apiUrl}?${new URLSearchParams(orderParams).toString()}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    
    console.log('[AliExpress DS] ========================================')
    console.log('[AliExpress DS] RESPOSTA COMPLETA DA API aliexpress.ds.order.create:')
    console.log(JSON.stringify(data, null, 2))
    console.log('[AliExpress DS] ========================================')

    // Verificar resposta
    if (data.error_response) {
      console.error('[AliExpress DS] Erro API:', data.error_response.msg)
      throw new Error(
        `Erro API AliExpress DS: ${data.error_response.msg} (${data.error_response.code})`
      )
    }

    if (data.aliexpress_ds_order_create_response?.result) {
      const result = data.aliexpress_ds_order_create_response.result
      
      // Verificar se o pedido foi criado com sucesso
      if (result.is_success === false || result.error_code) {
        const errorCode = result.error_code || 'Erro desconhecido'
        const errorMsg = result.error_msg || ''
        
        console.error('[AliExpress DS] Falha:', errorCode, '-', errorMsg)
        
        // Mensagens de erro específicas com dicas
        if (errorCode === 'SKU_NOT_EXIST') {
          throw new Error(
            'Produto não encontrado no AliExpress (SKU_NOT_EXIST). ' +
            `Produto ID: ${productInfo[0].product_id}. ` +
            'Possíveis causas: ' +
            '1) Produto foi removido do AliExpress, ' +
            '2) Produto tem variações e precisa de sku_attr específico, ' +
            '3) Produto não é elegível para dropshipping. ' +
            'Verifique: https://www.aliexpress.com/item/' + productInfo[0].product_id + '.html'
          )
        } else if (errorCode === 'B_DROPSHIPPER_DELIVERY_ADDRESS_VALIDATE_FAIL') {
          throw new Error(
            'Endereço de entrega inválido. Verifique o formato do endereço: ' +
            JSON.stringify(shippingInfo)
          )
        } else if (errorCode === 'PRICE_PAY_CURRENCY_ERROR') {
          throw new Error(
            'Produtos com moedas diferentes. Todos os produtos devem estar na mesma moeda.'
          )
        } else {
          throw new Error(`Erro ao criar pedido no AliExpress: ${errorCode}${errorMsg ? ' - ' + errorMsg : ''}`)
        }
      }
      
      // Extrair informações importantes do pedido
      const orderInfo = {
        order_id: result.order_id,
        order_list: result.order_list || [],
        is_success: result.is_success,
        error_msg: result.error_msg,
        // URL de pagamento (se disponível)
        payment_url: result.payment_url || result.check_out_url || null,
        // Informações de checkout
        checkout_info: result.checkout_info || null
      }
      
      console.log('[AliExpress DS] ✅ Pedido criado com sucesso!')
      console.log('[AliExpress DS] 📋 Número do Pedido:', orderInfo.order_id)
      console.log('[AliExpress DS] 💰 URL de Pagamento:', orderInfo.payment_url)
      console.log('[AliExpress DS] 📦 Pedidos criados:', orderInfo.order_list)
      
      if (orderInfo.payment_url) {
        console.log('[AliExpress DS] 🔗 Acesse esta URL para completar o pagamento:', orderInfo.payment_url)
        console.log('[AliExpress DS] ⚠️  IMPORTANTE: O pedido foi criado mas ainda não foi pago!')
        console.log('[AliExpress DS] ⚠️  Você precisa acessar a URL acima e completar o pagamento.')
      } else {
        console.log('[AliExpress DS] ℹ️  URL de pagamento não disponível na resposta.')
        console.log('[AliExpress DS] ℹ️  Acesse https://trade.aliexpress.com/ para gerenciar o pedido.')
      }
      
      // Não atualizar o pedido aqui - será atualizado no handler principal
      
      return orderInfo.order_id
    }

    throw new Error('Resposta inválida da API AliExpress DS')
  } catch (error: any) {
    console.error('[AliExpress DS] Erro:', error)
    throw new Error(`Falha ao criar pedido AliExpress: ${error.message}`)
  }
}

/**
 * Gerar assinatura HMAC-SHA256 para API AliExpress
 */
/**
 * Verificar se produto está disponível para dropshipping
 */
async function verifyProductForDropshipping(
  appKey: string,
  appSecret: string,
  accessToken: string,
  productId: string
): Promise<{ available: boolean; reason: string; skuInfo?: any }> {
  try {
    const crypto = require('crypto')
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Usar wholesale.get para verificar se está na lista DS
    const params: Record<string, any> = {
      app_key: appKey,
      method: 'aliexpress.ds.product.wholesale.get',
      session: accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      product_id: productId,
      ship_to_country: 'BR',
    }

    // Gerar assinatura
    const sortedKeys = Object.keys(params)
      .filter(key => key !== 'sign')
      .sort()
    const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
    const sign = crypto.createHmac('sha256', appSecret)
      .update(signString)
      .digest('hex')
      .toUpperCase()
    
    params.sign = sign

    const url = `${apiUrl}?${new URLSearchParams(params).toString()}`
    const response = await fetch(url, { method: 'GET' })
    const data = await response.json()

    console.log('[AliExpress DS] ========================================')
    console.log('[AliExpress DS] RESPOSTA COMPLETA DA API ds.product.get:')
    console.log(JSON.stringify(data, null, 2))
    console.log('[AliExpress DS] ========================================')

    // Verificar se retornou erro
    if (data.error_response) {
      const errorCode = data.error_response.code
      const errorMsg = data.error_response.msg

      if (errorCode === 'ITEM_ID_NOT_FOUND') {
        return { available: false, reason: 'Produto não encontrado na sua lista de dropshipping' }
      } else if (errorMsg.includes('not allowed to this country')) {
        return { available: false, reason: 'Produto não disponível para o Brasil' }
      } else {
        return { available: false, reason: `Produto não está na sua lista DS: ${errorMsg}` }
      }
    }

    // Se retornou dados do produto via wholesale.get, está na lista DS
    if (data.aliexpress_ds_product_wholesale_get_response?.result) {
      const productData = data.aliexpress_ds_product_wholesale_get_response.result
      
      // Buscar SKUs disponíveis
      let skusArray = []
      
      // Estrutura wholesale.get: ae_item_sku_info_dtos.ae_item_sku_info_d_t_o
      if (productData.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o) {
        skusArray = productData.ae_item_sku_info_dtos.ae_item_sku_info_d_t_o
      }
      
      let firstValidSku = null
      
      if (Array.isArray(skusArray) && skusArray.length > 0) {
        // Buscar primeiro SKU com estoque disponível
        for (const sku of skusArray) {
          const stock = sku.ipm_sku_stock || sku.sku_available_stock || 0
          
          // Pegar o primeiro SKU com estoque > 0
          if (stock > 0) {
            firstValidSku = {
              sku_id: sku.sku_id || sku.skuId || sku.s_k_u_id,
              sku_attr: sku.sku_attr || sku.id || '',
              sku_code: sku.sku_code || sku.skuCode || '',
              stock: stock,
            }
            console.log(`[AliExpress DS] ✅ SKU com estoque: Attr=${firstValidSku.sku_attr}, Stock=${stock}`)
            break
          }
        }
        
        // Se não encontrou SKU com estoque, pegar a primeira mesmo assim
        if (!firstValidSku && skusArray.length > 0) {
          const sku = skusArray[0]
          firstValidSku = {
            sku_id: sku.sku_id || sku.skuId || sku.s_k_u_id,
            sku_attr: sku.sku_attr || sku.id || '',
            sku_code: sku.sku_code || sku.skuCode || '',
            stock: 0,
          }
          console.warn('[AliExpress DS] ⚠️ Nenhuma SKU com estoque. Usando primeira:', firstValidSku.sku_attr);
        }
      } else {
        console.log('[AliExpress DS] ❌ Produto sem SKUs na lista DS');
        return { 
          available: false, 
          reason: 'Produto sem SKUs disponíveis na sua lista de dropshipping. Adicione o produto à sua lista DS primeiro.' 
        };
      }
      
      return { 
        available: true, 
        reason: 'Produto está na lista DS',
        skuInfo: firstValidSku
      };
    }

    return { available: false, reason: 'Produto não encontrado na sua lista de dropshipping. Adicione-o primeiro em ds.aliexpress.com' };
  } catch (error: any) {
    console.error('[AliExpress DS] Erro ao verificar produto:', error);
    return { available: false, reason: `Erro na verificação: ${error.message}` };
  }
}

/**
 * Gerar assinatura HMAC-SHA256 para API AliExpress
 */
function generateAliExpressSign(params: Record<string, any>, appSecret: string): string {
  const crypto = require('crypto')
  
  // Ordenar parâmetros alfabeticamente (excluindo 'sign')
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort()
  
  // Concatenar key1value1key2value2
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  
  // HMAC-SHA256
  const signature = crypto.createHmac('sha256', appSecret)
    .update(signString)
    .digest('hex')
    .toUpperCase()
  
  return signature
}

/**
 * Enviar pedido para Shopify
 */
async function sendToShopify(
  supplier: any,
  order: any,
  items: any[]
): Promise<string> {
  try {
    // Shopify não está implementado no schema - retorna mensagem
    throw new Error('Integração Shopify não configurada. Configure as credenciais do fornecedor.')
  } catch (error: any) {
    throw new Error(`Erro ao criar pedido no Shopify: ${error.message}`)
  }
}

/**
 * Parse endereço de envio
 * Formato: "Rua, Numero, Bairro, Cidade, Estado, CEP"
 */
function parseShippingAddress(address: string) {
  const parts = address.split(',').map(p => p.trim())
  
  // Mapa de estados BR (sem acentos para AliExpress)
  const stateMap: Record<string, string> = {
    'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapa', 'AM': 'Amazonas',
    'BA': 'Bahia', 'CE': 'Ceara', 'DF': 'Distrito Federal', 'ES': 'Espirito Santo',
    'GO': 'Goias', 'MA': 'Maranhao', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
    'MG': 'Minas Gerais', 'PA': 'Para', 'PB': 'Paraiba', 'PR': 'Parana',
    'PE': 'Pernambuco', 'PI': 'Piaui', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
    'RS': 'Rio Grande do Sul', 'RO': 'Rondonia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
    'SP': 'Sao Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
  }
  
  // Extrair CEP
  let zip = ''
  const cepMatch = address.match(/(\d{5}-?\d{3})/)
  if (cepMatch) {
    zip = cepMatch[1].replace('-', '')
  }
  
  // Identificar estado
  let provinceName = ''
  let provinceCode = ''
  const stateMatch = address.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/)
  if (stateMatch) {
    provinceCode = stateMatch[1].toUpperCase()
    provinceName = stateMap[provinceCode] || provinceCode
  }
  
  // Extrair cidade (antes do estado/CEP)
  let city = ''
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    if (!part.match(/\d{5}-?\d{3}/) && 
        !part.match(/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i) && 
        !Object.values(stateMap).some(s => part.match(new RegExp(s, 'i'))) && 
        part.length > 2) {
      city = part.replace(/[áàâã]/gi, 'a').replace(/[éê]/gi, 'e').replace(/[í]/gi, 'i').replace(/[óôõ]/gi, 'o').replace(/[ú]/gi, 'u').replace(/[ç]/gi, 'c')
      break
    }
  }
  
  // Montar rua + número
  let street = parts[0] || ''
  let streetNumber = 'SN'
  
  if (parts[1] && parts[1].match(/^(SN|S\/N|\d+)$/i)) {
    streetNumber = parts[1].toUpperCase() === 'SN' || parts[1].toUpperCase() === 'S/N' ? 'SN' : parts[1]
  }
  
  // Bairro/Distrito (geralmente posição 2)
  let district = ''
  if (parts.length > 2 && parts[2] && !parts[2].match(/\d{5}-?\d{3}/) && parts[2] !== city) {
    district = parts[2]
  }
  
  // Complemento (resto que não é cidade, estado, CEP, número)
  let complement = ''
  const complementParts = []
  for (let i = 2; i < parts.length; i++) {
    const part = parts[i]
    if (!part.match(/^(SN|S\/N|\d+)$/i) && 
        !part.match(/\d{5}-?\d{3}/) && 
        !part.match(/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i) && 
        !Object.values(stateMap).some(s => part.match(new RegExp(s, 'i'))) && 
        part !== city && part !== district) {
      complementParts.push(part)
    }
  }
  complement = complementParts.join(', ')
  
  return {
    street: street,
    streetNumber: streetNumber,
    district: district,
    complement: complement,
    city: city || 'Sao Luis',
    provinceName: provinceName || 'Maranhao',
    provinceCode: provinceCode || 'MA',
    zip: zip || '',
    country: 'BR',
    phone: '',
    // Campos legados para compatibilidade
    address1: `${street}, ${streetNumber}`,
    address2: complement || district,
  }
}
