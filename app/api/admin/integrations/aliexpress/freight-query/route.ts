import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Consultar frete de um produto AliExpress
 * API: aliexpress.ds.freight.query
 * 
 * Retorna todas as opções de frete disponíveis com preço e prazo
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { productId, quantity = 1, skuId } = await req.json()

    if (!productId) {
      return NextResponse.json({ error: 'productId é obrigatório' }, { status: 400 })
    }

    // Buscar credenciais
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      return NextResponse.json({
        error: 'Credenciais AliExpress não configuradas'
      }, { status: 400 })
    }

    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Se não tem SKU, buscar o primeiro SKU do produto
    let selectedSkuId = skuId
    if (!selectedSkuId) {
      // Buscar dados do produto para pegar o primeiro SKU
      const productParams: Record<string, any> = {
        app_key: auth.appKey,
        method: 'aliexpress.ds.product.get',
        session: auth.accessToken,
        timestamp: timestamp,
        format: 'json',
        v: '2.0',
        sign_method: 'sha256',
        product_id: productId,
        target_currency: 'BRL',
        target_language: 'pt',
        country: 'BR',
        ship_to_country: 'BR',
      }

      const productSortedKeys = Object.keys(productParams).filter(key => key !== 'sign').sort()
      const productSignString = productSortedKeys.map(key => `${key}${productParams[key]}`).join('')
      const productSignature = crypto.createHmac('sha256', auth.appSecret)
        .update(productSignString)
        .digest('hex')
        .toUpperCase()
      productParams.sign = productSignature

      const productUrl = `${apiUrl}?${new URLSearchParams(productParams).toString()}`
      const productResponse = await fetch(productUrl, { method: 'GET' })
      const productData = await productResponse.json()

      if (productData.aliexpress_ds_product_get_response?.result) {
        const result = productData.aliexpress_ds_product_get_response.result
        const skus = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
        const skuList = Array.isArray(skus) ? skus : [skus]
        
        if (skuList.length > 0 && skuList[0].id) {
          selectedSkuId = skuList[0].id
          console.log('[Freight Query] SKU encontrado:', selectedSkuId)
        }
      }
    }

    // Se ainda não tem SKU, retornar erro
    if (!selectedSkuId) {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível encontrar SKU do produto. O produto pode não estar disponível.',
        productId,
        rawResponse: null
      })
    }

    // Dados para consulta de frete - FORMATO QUE FUNCIONA (igual ao send-to-supplier)
    const queryDeliveryReq: any = {
      quantity: String(quantity),
      shipToCountry: 'BR',
      productId: String(productId),
      selectedSkuId: String(selectedSkuId),
      language: 'en_US',
      currency: 'BRL',
      locale: 'pt_BR',
    }

    console.log('[Freight Query] queryDeliveryReq:', JSON.stringify(queryDeliveryReq, null, 2))

    const params: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.freight.query',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      queryDeliveryReq: JSON.stringify(queryDeliveryReq),
    }

    // Gerar assinatura
    const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
    const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
    const signature = crypto.createHmac('sha256', auth.appSecret)
      .update(signString)
      .digest('hex')
      .toUpperCase()
    
    params.sign = signature

    const url = `${apiUrl}?${new URLSearchParams(params).toString()}`

    console.log('[Freight Query] Consultando frete para produto:', productId)
    console.log('[Freight Query] Parâmetros:', JSON.stringify(queryDeliveryReq, null, 2))

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await response.json()

    console.log('[Freight Query] Resposta:', JSON.stringify(data, null, 2))

    // Processar resposta
    let freightOptions: any[] = []
    let success = false
    let errorMsg = ''
    let debugInfo = {}

    if (data.aliexpress_ds_freight_query_response?.result) {
      const result = data.aliexpress_ds_freight_query_response.result
      
      console.log('[Freight Query] Result completo:', JSON.stringify(result, null, 2))
      
      // Adicionar informações de debug
      debugInfo = {
        hasResult: !!result,
        resultSuccess: result.success,
        resultErrorCode: result.error_code,
        resultErrorMessage: result.error_message,
        hasDeliveryOptions: !!result.delivery_options,
        deliveryOptionsType: typeof result.delivery_options,
        deliveryOptionsKeys: result.delivery_options ? Object.keys(result.delivery_options) : [],
        rawResultKeys: Object.keys(result)
      }
      
      // Verificar se a consulta foi bem sucedida
      if (result.success) {
        success = true
        
        // Formato novo: delivery_options.delivery_option_d_t_o
        const deliveryOptions = result.delivery_options?.delivery_option_d_t_o || []
        if (Array.isArray(deliveryOptions) && deliveryOptions.length > 0) {
          freightOptions = deliveryOptions
          console.log('[Freight Query] Opções de entrega encontradas:', deliveryOptions.length)
        }
      } else {
        // Se não foi sucesso, capturar erro
        errorMsg = result.error_message || result.error_code || 'DELIVERY_INFO_EMPTY'
        console.log('[Freight Query] Erro no result:', errorMsg)
      }
      
      // Formato antigo: aeop_freight_calculate_result_for_buyer_d_t_o_list
      if (freightOptions.length === 0) {
        freightOptions = 
          result.aeop_freight_calculate_result_for_buyer_d_t_o_list?.aeop_freight_calculate_result_for_buyer_dto ||
          result.aeop_freight_calculate_result_for_buyer_d_t_o_list ||
          result.freight_list ||
          result.result_list ||
          []
      }
      
      // Garantir que é array
      if (!Array.isArray(freightOptions)) {
        freightOptions = [freightOptions]
      }
      
      console.log('[Freight Query] Total opções:', freightOptions.length)
    } else if (data.error_response) {
      errorMsg = data.error_response.msg || 'Erro desconhecido'
      console.log('[Freight Query] Erro:', errorMsg)
    }

    // Formatar opções de frete (suporta ambos os formatos)
    const formattedOptions = freightOptions.map((opt: any) => ({
      serviceName: opt.company || opt.code || opt.service_name || opt.serviceName || 'Padrão',
      price: opt.shipping_fee_format || opt.freight_amount || opt.price || 
             (opt.shipping_fee_cent ? (opt.shipping_fee_cent / 100).toFixed(2) : '0'),
      priceCents: opt.shipping_fee_cent || (parseFloat(opt.freight_amount || opt.price || '0') * 100),
      currency: opt.currency || 'BRL',
      deliveryDays: opt.delivery_date_desc || opt.estimated_delivery_time || opt.delivery_time || 'N/A',
      deliveryDaysMin: opt.min_delivery_days || opt.estimated_delivery_time_min || null,
      deliveryDaysMax: opt.max_delivery_days || opt.estimated_delivery_time_max || null,
      trackingAvailable: opt.tracking === true || opt.tracking_available === 'true',
      isFreeShipping: opt.free_shipping === true || opt.is_free_shipping === 'true' || 
                       (opt.shipping_fee_cent && parseInt(opt.shipping_fee_cent) === 0),
      // Dados brutos para análise
      raw: opt
    }))

    return NextResponse.json({
      success,
      productId,
      quantity,
      skuId: selectedSkuId,
      optionsCount: formattedOptions.length,
      freightOptions: formattedOptions,
      rawResponse: data,
      debugInfo, // Adicionar informações de debug
      error: errorMsg || undefined,
      // Parâmetros usados
      requestParams: queryDeliveryReq
    })

  } catch (error: any) {
    console.error('[Freight Query] Erro:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
