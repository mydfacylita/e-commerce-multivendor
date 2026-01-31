import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'crypto'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * API para enviar pedido ao fornecedor
 * Suporta: AliExpress DS, Shopify, APIs genéricas
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

      // Verificar se é AliExpress
      const isAliExpress = supplier.name?.toLowerCase().includes('aliexpress')

      if ((supplier.apiUrl && supplier.apiKey) || isAliExpress) {
        try {
          const supplierOrderId = await sendToSupplierAPI(supplier, order, items)
          console.log(`[Pedido ${orderId}] Sucesso: ${supplierOrderId}`)
          
          // SALVAR o supplierOrderId nos itens do pedido
          for (const item of items) {
            await prisma.orderItem.update({
              where: { id: item.id },
              data: {
                supplierOrderId: String(supplierOrderId),
                supplierStatus: 'PLACED',
              },
            })
          }
          
          results.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            status: 'sent',
            supplierOrderId,
          })
        } catch (error: any) {
          console.error(`[Pedido ${orderId}] Erro:`, error.message)
          
          // Salvar o erro no item
          for (const item of items) {
            await prisma.orderItem.update({
              where: { id: item.id },
              data: {
                supplierStatus: 'ERROR',
              },
            })
          }
          
          results.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            status: 'error',
            error: error.message,
          })
        }
      } else {
        results.push({
          supplierId: supplier.id,
          supplierName: supplier.name,
          status: 'manual',
          message: 'Enviar pedido manualmente',
        })
      }
    }

    // Coletar todos os supplierOrderIds para salvar na Order
    const allSupplierOrderIds = results
      .filter(r => r.status === 'sent' && r.supplierOrderId)
      .map(r => r.supplierOrderId)
    
    // Atualizar pedido como enviado + salvar supplierOrderId
    await prisma.order.update({
      where: { id: orderId },
      data: {
        sentToSupplier: true,
        sentToSupplierAt: new Date(),
        status: 'PROCESSING',
        // Salvar o primeiro supplierOrderId (ou concatenar se múltiplos)
        supplierOrderId: allSupplierOrderIds.length > 0 
          ? allSupplierOrderIds.join(',') 
          : undefined,
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
 * Roteador para APIs de fornecedores
 */
async function sendToSupplierAPI(supplier: any, order: any, items: any[]): Promise<string> {
  // AliExpress
  if (supplier.name?.toLowerCase().includes('aliexpress') || supplier.apiUrl?.includes('aliexpress')) {
    return await sendToAliExpress(order, items)
  }

  // Shopify
  if (supplier.apiUrl?.includes('myshopify.com')) {
    return await sendToShopify(supplier, order, items)
  }

  // API genérica
  return await sendToGenericAPI(supplier, order, items)
}

// ============================================================
// ALIEXPRESS DS - FORMATO CORRETO (TESTADO E FUNCIONANDO)
// ============================================================

async function sendToAliExpress(order: any, items: any[]): Promise<string> {
  console.log('[AliExpress] ====== CRIANDO PEDIDO ======')
  
  // 1. Buscar credenciais
  const auth = await prisma.aliExpressAuth.findFirst()
  if (!auth?.accessToken) {
    throw new Error('Credenciais AliExpress não configuradas')
  }

  // 2. Parsear endereço
  const addr = parseShippingAddress(order.shippingAddress)
  
  // Telefone: APENAS 10-11 dígitos (sem código de país)
  let phone = (addr.phone || order.buyerPhone || order.user?.phone || '').replace(/\D/g, '')
  if (phone.startsWith('55')) phone = phone.substring(2) // Remover código do Brasil
  if (phone.length < 10) phone = '11999999999' // Fallback
  
  // CPF: apenas números (11 dígitos)
  const cpf = (addr.cpf || order.buyerCpf || order.user?.cpf || '').replace(/\D/g, '')
  
  // 3. Consultar método de frete para cada produto
  const productItems = []
  
  for (const item of items) {
    // product.supplierSku = ID do produto no AliExpress (ex: 1005006825260435)
    const productId = String(item.product.supplierSku || '')
    
    // item.supplierSkuId = SKU selecionado (ex: 12000038466325490)
    // Mas para criar pedido, precisamos do sku_attr (ex: 200001176:200004889#40 color 01)
    const skuId = item.supplierSkuId || ''
    
    // Tentar extrair sku_attr do produto (selectedSkus pode ter essa info)
    let skuAttr = ''
    try {
      const selectedSkus = item.product.selectedSkus ? JSON.parse(item.product.selectedSkus) : null
      if (selectedSkus && Array.isArray(selectedSkus)) {
        // Buscar o SKU correspondente
        const matchedSku = selectedSkus.find((s: any) => s.sku_id === skuId || s.id === skuId)
        if (matchedSku?.sku_attr) {
          skuAttr = matchedSku.sku_attr
        } else if (matchedSku?.id) {
          skuAttr = matchedSku.id // id geralmente é o sku_attr
        }
      }
    } catch (e) {
      // Ignorar erro de parse
    }
    
    if (!productId) {
      console.log('[AliExpress] Item sem supplierSku, pulando:', item.product.name)
      continue
    }
    
    // Consultar frete disponível
    let shippingMethod = 'CAINIAO_STANDARD' // Fallback
    
    try {
      const freightMethod = await queryAliExpressFreight(
        auth,
        productId,
        skuId,
        addr.provinceName || 'Sao Paulo',
        addr.city || 'Sao Paulo'
      )
      if (freightMethod) {
        shippingMethod = freightMethod
      }
    } catch (e) {
      console.log('[AliExpress] Usando método de frete padrão:', shippingMethod)
    }
    
    // IMPORTANTE: Usar sku_attr (não sku_id) para criar pedido
    const productItem: any = {
      product_id: productId,
      product_count: Number(item.quantity),
      logistics_service_name: shippingMethod,
    }
    
    // Preferir sku_attr sobre sku_id
    if (skuAttr) {
      productItem.sku_attr = skuAttr
    }
    // Se não tiver sku_attr, não incluir - AliExpress pode aceitar produto sem variação
    
    productItems.push(productItem)
  }
  
  if (productItems.length === 0) {
    throw new Error('Nenhum item válido para enviar ao AliExpress')
  }
  
  // 4. Montar request no formato correto
  // Montar endereço completo: rua + número + complemento
  const addressLine1 = [
    addr.street || '',
    addr.streetNumber || '',
    addr.complement || ''
  ].filter(Boolean).join(' ').trim() || 'Endereco'
  
  const placeOrderRequest = {
    product_items: productItems,
    logistics_address: {
      address: addressLine1,
      address2: addr.district || '',  // Bairro
      city: addr.city || 'Sao Paulo',
      contact_person: order.user?.name || 'Cliente',
      country: 'BR',
      full_name: order.user?.name || 'Cliente',
      mobile_no: phone,
      phone_country: '55',
      province: addr.provinceName || 'Sao Paulo',
      zip: addr.zip || '',
      cpf: cpf,
    },
  }

  console.log('[AliExpress] Request:', JSON.stringify(placeOrderRequest, null, 2))

  // 5. Parâmetros da API
  const timestamp = Date.now().toString()
  const params: Record<string, string> = {
    app_key: auth.appKey,
    method: 'aliexpress.ds.order.create',
    session: auth.accessToken,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    param_place_order_request4_open_api_d_t_o: JSON.stringify(placeOrderRequest),
  }

  // 6. Gerar assinatura
  params.sign = generateSign(params, auth.appSecret)

  // 7. Chamar API
  const url = `https://api-sg.aliexpress.com/sync?${new URLSearchParams(params).toString()}`
  
  console.log('[AliExpress] Enviando request...')
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = await response.json()
  
  console.log('[AliExpress] Resposta:', JSON.stringify(data, null, 2))

  // 8. Verificar erros
  if (data.error_response) {
    const code = data.error_response.code || ''
    const msg = data.error_response.msg || ''
    const subMsg = data.error_response.sub_msg || ''
    throw new Error(`API Error: ${code} - ${msg} ${subMsg}`)
  }

  // 9. Extrair resultado
  const result = data.aliexpress_ds_order_create_response?.result
  
  // Sucesso - order_list.number contém o(s) ID(s) do pedido
  if (result?.is_success && result?.order_list?.number) {
    const orderIds = result.order_list.number
    const orderId = Array.isArray(orderIds) ? orderIds[0] : orderIds
    console.log('[AliExpress] ✅ Pedido criado:', orderId)
    return String(orderId)
  }
  
  if (result?.order_id) {
    console.log('[AliExpress] ✅ Pedido criado:', result.order_id)
    return String(result.order_id)
  }
  
  if (result?.error_code) {
    throw new Error(`${result.error_code}: ${result.error_msg || 'Erro desconhecido'}`)
  }

  throw new Error('Resposta inválida da API AliExpress')
}

/**
 * Consultar métodos de frete disponíveis para um produto
 */
async function queryAliExpressFreight(
  auth: any,
  productId: string,
  skuId: string,
  province: string,
  city: string
): Promise<string | null> {
  const queryDeliveryReq = JSON.stringify({
    quantity: '1',
    shipToCountry: 'BR',
    productId: productId,
    provinceCode: province,
    cityCode: city,
    selectedSkuId: skuId,
    language: 'pt_BR',
    currency: 'BRL',
    locale: 'pt_BR',
  })

  const params: Record<string, string> = {
    app_key: auth.appKey,
    method: 'aliexpress.ds.freight.query',
    session: auth.accessToken,
    timestamp: Date.now().toString(),
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    queryDeliveryReq: queryDeliveryReq,
  }

  params.sign = generateSign(params, auth.appSecret)

  const url = `https://api-sg.aliexpress.com/sync?${new URLSearchParams(params).toString()}`
  const response = await fetch(url)
  const data = await response.json()

  const options = data.aliexpress_ds_freight_query_response?.result?.delivery_options?.delivery_option_d_t_o || []
  
  if (options.length > 0) {
    // Preferir métodos mais rápidos/confiáveis
    const preferred = ['CAINIAO_FULFILLMENT_STD', 'CAINIAO_STANDARD', 'AliExpress Standard Shipping']
    for (const pref of preferred) {
      const found = options.find((o: any) => o.code === pref)
      if (found) return found.code
    }
    // Retornar primeiro disponível
    return options[0].code
  }

  return null
}

/**
 * Gerar assinatura HMAC-SHA256
 */
function generateSign(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort()
  const signString = sortedKeys.map(k => `${k}${params[k]}`).join('')
  return createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase()
}

// ============================================================
// SHOPIFY
// ============================================================

async function sendToShopify(supplier: any, order: any, items: any[]): Promise<string> {
  const addr = parseShippingAddress(order.shippingAddress)
  
  const shopifyOrder = {
    order: {
      line_items: items.map(item => ({
        variant_id: item.product.supplierSku,
        quantity: item.quantity,
      })),
      shipping_address: {
        first_name: order.user?.name?.split(' ')[0] || 'Cliente',
        last_name: order.user?.name?.split(' ').slice(1).join(' ') || '',
        address1: addr.street,
        address2: addr.complement,
        city: addr.city,
        province: addr.provinceName,
        country: 'BR',
        zip: addr.zip,
        phone: addr.phone,
      },
      note: `Pedido MYDSHOP: ${order.id}`,
    },
  }

  const response = await fetch(`${supplier.apiUrl}/admin/api/2024-01/orders.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': supplier.apiKey,
    },
    body: JSON.stringify(shopifyOrder),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Shopify error: ${error}`)
  }

  const data = await response.json()
  return String(data.order?.id || 'SHOPIFY_ORDER')
}

// ============================================================
// API GENÉRICA
// ============================================================

async function sendToGenericAPI(supplier: any, order: any, items: any[]): Promise<string> {
  const response = await fetch(supplier.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supplier.apiKey}`,
    },
    body: JSON.stringify({
      shipping_address: order.shippingAddress,
      items: items.map(item => ({
        sku: item.product.supplierSku,
        quantity: item.quantity,
        product_name: item.product.name,
      })),
      reference_id: order.id,
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${await response.text()}`)
  }

  const data = await response.json()
  return data.order_id || data.id || 'SENT'
}

// ============================================================
// PARSEAR ENDEREÇO
// ============================================================

function parseShippingAddress(address: string) {
  const stateMap: Record<string, string> = {
    'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapa', 'AM': 'Amazonas',
    'BA': 'Bahia', 'CE': 'Ceara', 'DF': 'Distrito Federal', 'ES': 'Espirito Santo',
    'GO': 'Goias', 'MA': 'Maranhao', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
    'MG': 'Minas Gerais', 'PA': 'Para', 'PB': 'Paraiba', 'PR': 'Parana',
    'PE': 'Pernambuco', 'PI': 'Piaui', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
    'RS': 'Rio Grande do Sul', 'RO': 'Rondonia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
    'SP': 'Sao Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
  }

  // Tentar JSON primeiro
  try {
    const parsed = JSON.parse(address)
    const stateCode = (parsed.state || '').toUpperCase()
    const provinceName = stateMap[stateCode] || parsed.state || 'Sao Paulo'
    
    // Remover acentos
    const removeAccents = (str: string) => str
      .replace(/[áàâã]/gi, 'a')
      .replace(/[éê]/gi, 'e')
      .replace(/[í]/gi, 'i')
      .replace(/[óôõ]/gi, 'o')
      .replace(/[ú]/gi, 'u')
      .replace(/[ç]/gi, 'c')
    
    return {
      street: parsed.street || '',
      streetNumber: parsed.number || parsed.streetNumber || 'SN',
      district: parsed.neighborhood || parsed.district || '',
      complement: parsed.complement || '',
      city: removeAccents(parsed.city || 'Sao Paulo'),
      provinceName: provinceName,
      provinceCode: stateCode || 'SP',
      zip: (parsed.zipCode || parsed.zip || '').replace(/\D/g, ''),
      country: 'BR',
      phone: parsed.phone || '',
      cpf: parsed.cpf || '',
      address1: `${parsed.street || ''}, ${parsed.number || 'SN'}`,
      address2: parsed.complement || parsed.neighborhood || '',
    }
  } catch (e) {
    // Não é JSON
  }

  // Parsear string
  const parts = address.split(',').map(p => p.trim())
  
  let zip = ''
  const cepMatch = address.match(/(\d{5}-?\d{3})/)
  if (cepMatch) zip = cepMatch[1].replace('-', '')
  
  let provinceCode = ''
  let provinceName = ''
  const stateMatch = address.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i)
  if (stateMatch) {
    provinceCode = stateMatch[1].toUpperCase()
    provinceName = stateMap[provinceCode] || provinceCode
  }
  
  return {
    street: parts[0] || '',
    streetNumber: parts[1] || 'SN',
    district: parts[2] || '',
    complement: parts[3] || '',
    city: parts[4] || 'Sao Paulo',
    provinceName: provinceName || 'Sao Paulo',
    provinceCode: provinceCode || 'SP',
    zip: zip,
    country: 'BR',
    phone: '',
    cpf: '',
    address1: `${parts[0] || ''}, ${parts[1] || 'SN'}`,
    address2: parts[3] || parts[2] || '',
  }
}
