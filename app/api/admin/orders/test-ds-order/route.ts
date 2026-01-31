import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Mapeamento de estados para código do AliExpress
const STATE_CODES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapa', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceara', 'DF': 'Distrito Federal', 'ES': 'Espirito Santo',
  'GO': 'Goias', 'MA': 'Maranhao', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Para', 'PB': 'Paraiba', 'PR': 'Parana',
  'PE': 'Pernambuco', 'PI': 'Piaui', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondonia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'Sao Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
}

/**
 * Simular criação de pedido no AliExpress DS
 * Valida todos os dados sem criar pedido real
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { productId, quantity, address, simulate = true, skuAttr } = await req.json()

    if (!productId) {
      return NextResponse.json({ error: 'Product ID é obrigatório' }, { status: 400 })
    }

    // Buscar credenciais
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      return NextResponse.json({ 
        error: 'AliExpress não configurado',
        step: 'auth',
        success: false
      }, { status: 400 })
    }

    const validationErrors: string[] = []
    const warnings: string[] = []

    // ============================================
    // PASSO 1: Validar dados obrigatórios
    // ============================================
    if (!address.name) validationErrors.push('Nome é obrigatório')
    if (!address.phone) validationErrors.push('Telefone é obrigatório')
    if (!address.cpf) validationErrors.push('CPF é obrigatório para Brasil')
    if (!address.street) validationErrors.push('Rua é obrigatória')
    if (!address.city) validationErrors.push('Cidade é obrigatória')
    if (!address.state) validationErrors.push('Estado é obrigatório')
    if (!address.zip) validationErrors.push('CEP é obrigatório')

    // Validar formato do telefone
    const phone = address.phone?.replace(/\D/g, '')
    if (phone && phone.length < 10) {
      validationErrors.push('Telefone deve ter pelo menos 10 dígitos')
    }

    // Validar CPF
    const cpf = address.cpf?.replace(/\D/g, '')
    if (cpf && cpf.length !== 11) {
      validationErrors.push('CPF deve ter 11 dígitos')
    }

    // Validar CEP
    const zip = address.zip?.replace(/\D/g, '')
    if (zip && zip.length !== 8) {
      validationErrors.push('CEP deve ter 8 dígitos')
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        step: 'validation',
        message: 'Dados inválidos',
        errors: validationErrors,
        orderData: null
      })
    }

    // ============================================
    // PASSO 2: Verificar produto no DS
    // ============================================
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    const productParams: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.product.get',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      product_id: String(productId),
      ship_to_country: 'BR',
      target_currency: 'BRL',
      target_language: 'PT',
    }
    productParams.sign = generateSign(productParams, auth.appSecret)

    console.log('[Test DS Order] Verificando produto:', productId)

    const productResponse = await fetch(`${apiUrl}?${new URLSearchParams(productParams).toString()}`)
    const productData = await productResponse.json()

    if (productData.error_response) {
      return NextResponse.json({
        success: false,
        step: 'product_check',
        message: 'Produto não encontrado na lista DS',
        error: productData.error_response.msg,
        code: productData.error_response.code,
        hint: 'Adicione o produto à sua lista DS em ds.aliexpress.com',
        rawResponse: productData
      })
    }

    const productResult = productData.aliexpress_ds_product_get_response?.result
    if (!productResult) {
      return NextResponse.json({
        success: false,
        step: 'product_check',
        message: 'Produto não está na sua lista de Dropshipping',
        hint: 'Vá em ds.aliexpress.com e adicione este produto à sua lista DS'
      })
    }

    const productInfo = productResult.ae_item_base_info_dto
    const skuList = productResult.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []

    // Verificar se produto está à venda
    if (productInfo.product_status_type !== 'onSelling') {
      return NextResponse.json({
        success: false,
        step: 'product_check',
        message: 'Produto não está mais à venda',
        status: productInfo.product_status_type
      })
    }

    // Determinar SKU a usar
    let selectedSku = skuList[0]
    let selectedSkuAttr = skuAttr || ''

    if (skuList.length > 1 && !skuAttr) {
      warnings.push(`Produto tem ${skuList.length} variações. Usando primeira SKU disponível.`)
      selectedSku = skuList.find((s: any) => s.sku_available_stock > 0 || s.sku_stock) || skuList[0]
      selectedSkuAttr = selectedSku.sku_attr || ''
    }

    // ============================================
    // PASSO 3: Consultar frete
    // ============================================
    // Converter estado para nome válido do AliExpress (sem acentos)
    const provinceName = STATE_CODES[address.state?.toUpperCase()] || address.state || 'Sao Paulo'
    const cityName = address.city || 'Sao Paulo'

    // Formato correto conforme documentação AliExpress:
    // - itemId: ID do produto
    // - quantity: quantidade  
    // - address: objeto JSON com country, province, city, etc.
    const addressObj = {
      country: 'BR',
      province: provinceName,
      city: cityName,
      district: address.district || '',
      zipCode: zip || '',
      addressLine1: `${address.street || ''} ${address.number || ''}`.trim(),
      recipientName: address.name || 'Cliente'
    }

    const freightParams: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.freight.query',
      session: auth.accessToken,
      timestamp: Date.now().toString(),
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      queryDeliveryReq: JSON.stringify({
        productId: String(productId),
        quantity: quantity || 1,
        shipToCountry: 'BR',
        address: JSON.stringify(addressObj),
        selectedSkuId: selectedSku?.sku_id ? String(selectedSku.sku_id) : undefined,
        locale: 'pt_BR',
        language: 'pt_BR',
        currency: 'BRL',
      }),
    }
    freightParams.sign = generateSign(freightParams, auth.appSecret)

    console.log('[Test DS Order] Consultando frete para:', provinceName, '/', cityName, 'Address:', addressObj)

    const freightResponse = await fetch(`${apiUrl}?${new URLSearchParams(freightParams).toString()}`)
    const freightData = await freightResponse.json()

    let shippingMethod = 'CAINIAO_STANDARD'
    let shippingCost = 0
    let shippingOptions: any[] = []

    const freightResult = freightData.aliexpress_ds_freight_query_response?.result
    if (freightResult?.success) {
      const options = freightResult.delivery_options?.delivery_option_d_t_o || []
      shippingOptions = options.map((opt: any) => ({
        code: opt.code,
        company: opt.company,
        cost: parseFloat(opt.shipping_fee_cent || '0') / 100,
        days: opt.delivery_date_desc || `${opt.min_delivery_days}-${opt.max_delivery_days} dias`,
        isFree: opt.free_shipping === true
      }))

      if (shippingOptions.length > 0) {
        // Usar o mais barato
        shippingOptions.sort((a, b) => a.cost - b.cost)
        shippingMethod = shippingOptions[0].company || shippingOptions[0].code
        shippingCost = shippingOptions[0].cost
      }
    } else {
      warnings.push('Não foi possível consultar frete. Usando método padrão.')
    }

    // ============================================
    // PASSO 4: Montar dados do pedido
    // ============================================
    const orderData = {
      product_items: [{
        product_id: String(productId),
        product_count: parseInt(quantity) || 1,
        sku_attr: selectedSkuAttr,
      }],
      logistics_address: {
        address: address.street,
        address2: address.complement || '',
        city: address.city,
        contact_person: address.name,
        country: 'Brazil',
        cpf: cpf,
        county: address.district || '',
        full_name: address.name,
        locale: 'pt_BR',
        mobile_no: phone,
        phone_country: '55',
        province: provinceName,
        street_number: address.number || 'SN',
        zip: zip,
      },
      logistics_service_name: shippingMethod,
    }

    // ============================================
    // PASSO 5: Calcular custos
    // ============================================
    const productPrice = parseFloat(selectedSku?.offer_sale_price || selectedSku?.sku_price || '0')
    const totalCost = (productPrice * (parseInt(quantity) || 1)) + shippingCost

    // ============================================
    // RESPOSTA FINAL
    // ============================================
    return NextResponse.json({
      success: true,
      step: 'complete',
      message: simulate ? 'Simulação concluída com sucesso!' : 'Pronto para criar pedido',
      simulate,
      
      // Dados do produto
      product: {
        id: productId,
        title: productInfo.subject,
        status: productInfo.product_status_type,
        price: productPrice,
        currency: productInfo.currency_code || 'BRL',
        selectedSku: {
          skuId: selectedSku?.sku_id,
          skuAttr: selectedSkuAttr,
          price: productPrice,
          stock: selectedSku?.sku_available_stock || 'N/A'
        },
        totalSkus: skuList.length,
      },

      // Frete
      shipping: {
        method: shippingMethod,
        cost: shippingCost,
        costFormatted: `R$ ${shippingCost.toFixed(2)}`,
        options: shippingOptions.slice(0, 5),
      },

      // Custos
      costs: {
        productPrice,
        quantity: parseInt(quantity) || 1,
        subtotal: productPrice * (parseInt(quantity) || 1),
        shipping: shippingCost,
        total: totalCost,
        totalFormatted: `R$ ${totalCost.toFixed(2)}`,
      },

      // Dados que seriam enviados
      orderPayload: orderData,

      // Avisos e validações
      warnings,
      validationErrors: [],

      // Próximos passos
      nextSteps: simulate ? [
        '1. Revise os dados acima',
        '2. Se estiver tudo certo, desmarque "simulate" e execute novamente',
        '3. Ou use a página de pedidos para enviar pedidos reais'
      ] : [
        'O pedido será criado no AliExpress',
        'Você receberá um link para pagamento',
        'Após pagar, o fornecedor enviará o produto'
      ]
    })

  } catch (error: any) {
    console.error('[Test DS Order] Erro:', error)
    return NextResponse.json({ 
      success: false,
      step: 'error',
      error: error.message || 'Erro ao simular pedido',
    }, { status: 500 })
  }
}

/**
 * Gerar assinatura HMAC-SHA256 para API AliExpress
 */
function generateSign(params: Record<string, any>, appSecret: string): string {
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
