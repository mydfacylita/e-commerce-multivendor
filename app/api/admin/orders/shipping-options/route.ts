import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Buscar opções de frete disponíveis no AliExpress para um produto
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { productId, skuId, quantity, country, address } = await req.json()

    if (!productId) {
      return NextResponse.json({ message: 'Product ID é obrigatório' }, { status: 400 })
    }

    if (!skuId) {
      return NextResponse.json({ message: 'SKU ID é obrigatório' }, { status: 400 })
    }

    // Buscar credenciais
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      return NextResponse.json({ 
        message: 'AliExpress não configurado',
        options: [] 
      }, { status: 200 })
    }

    // Parsear endereço
    let parsedAddress: any = {}
    try {
      parsedAddress = typeof address === 'string' ? JSON.parse(address) : address
    } catch {
      parsedAddress = {}
    }

    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

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

    // Converter estado para nome válido
    const stateCode = (parsedAddress.state || parsedAddress.provinceName || '').toUpperCase()
    const provinceName = STATE_CODES[stateCode] || parsedAddress.state || parsedAddress.provinceName || 'Sao Paulo'
    const cityName = parsedAddress.city || 'Sao Paulo'

    // Formato correto conforme documentação AliExpress
    const addressObj = {
      country: country || 'BR',
      province: provinceName,
      city: cityName,
      district: parsedAddress.district || parsedAddress.neighborhood || '',
      zipCode: parsedAddress.zip || parsedAddress.postalCode || '',
      addressLine1: `${parsedAddress.street || parsedAddress.address1 || ''} ${parsedAddress.streetNumber || parsedAddress.number || ''}`.trim(),
      recipientName: parsedAddress.name || parsedAddress.contact_person || 'Cliente'
    }

    const queryDeliveryReq = {
      productId: String(productId),
      quantity: quantity || 1,
      shipToCountry: 'BR',
      address: JSON.stringify(addressObj),
      selectedSkuId: String(skuId),
      locale: 'pt_BR',
      language: 'pt_BR',
      currency: 'BRL',
    }

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
    params.sign = generateSign(params, auth.appSecret)

    const url = `${apiUrl}?${new URLSearchParams(params).toString()}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await response.json()

    // Retornar JSON real para debug
    if (data.error_response) {
      console.error('[Shipping] Erro API:', data.error_response)
      return NextResponse.json({ 
        message: data.error_response.msg || 'Erro ao buscar frete',
        options: [],
        rawResponse: data,
        requestParams: queryDeliveryReq
      }, { status: 200 })
    }

    const result = data.aliexpress_ds_freight_query_response?.result
    if (!result?.success) {
      return NextResponse.json({ 
        message: result?.error_message || 'Não foi possível obter opções de frete',
        options: [],
        rawResponse: data,
        requestParams: queryDeliveryReq
      }, { status: 200 })
    }

    // Extrair opções de entrega
    const deliveryOptions = result.delivery_options?.delivery_option_d_t_o || []
    
    // Ordenar por custo (grátis primeiro, depois mais baratos)
    deliveryOptions.sort((a: any, b: any) => {
      if (a.free_shipping && !b.free_shipping) return -1
      if (!a.free_shipping && b.free_shipping) return 1
      const costA = parseFloat(a.shipping_fee_cent || '999999')
      const costB = parseFloat(b.shipping_fee_cent || '999999')
      return costA - costB
    })

    // Formatar opções
    const options = deliveryOptions.map((opt: any) => ({
      code: opt.code || opt.company,
      company: opt.company || opt.code,
      cost: parseFloat(opt.shipping_fee_cent || '0') / 100,
      costFormatted: opt.shipping_fee_format || `R$ ${(parseFloat(opt.shipping_fee_cent || '0') / 100).toFixed(2)}`,
      deliveryDays: opt.delivery_date_desc || `${opt.min_delivery_days || '?'}-${opt.max_delivery_days || '?'} dias`,
      isFree: opt.free_shipping === true || parseFloat(opt.shipping_fee_cent || '0') === 0,
    }))

    return NextResponse.json({ 
      options,
      rawResponse: data,
      requestParams: queryDeliveryReq
    })

  } catch (error: any) {
    console.error('[Shipping] Erro:', error)
    return NextResponse.json({ 
      message: error.message || 'Erro ao buscar frete',
      options: [] 
    }, { status: 200 })
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
