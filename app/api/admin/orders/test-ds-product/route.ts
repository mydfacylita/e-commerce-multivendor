import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Verificar se um produto está disponível para Dropshipping
 * Usa a API aliexpress.ds.product.get
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { productId } = await req.json()

    if (!productId) {
      return NextResponse.json({ error: 'Product ID é obrigatório' }, { status: 400 })
    }

    // Buscar credenciais
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      return NextResponse.json({ 
        error: 'AliExpress não configurado',
        connected: false 
      }, { status: 400 })
    }

    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Parâmetros para verificar produto no DS
    const params: Record<string, any> = {
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

    // Gerar assinatura
    params.sign = generateSign(params, auth.appSecret)

    const url = `${apiUrl}?${new URLSearchParams(params).toString()}`
    
    console.log('[Test DS Product] Verificando produto:', productId)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await response.json()

    console.log('[Test DS Product] Resposta:', JSON.stringify(data, null, 2))

    // Verificar erro
    if (data.error_response) {
      return NextResponse.json({ 
        success: false,
        error: data.error_response.msg || 'Erro desconhecido',
        code: data.error_response.code,
        available: false,
        reason: 'Erro na API',
        rawResponse: data
      })
    }

    // Extrair resultado
    const result = data.aliexpress_ds_product_get_response?.result

    if (!result) {
      return NextResponse.json({ 
        success: false,
        error: 'Produto não encontrado na lista DS',
        available: false,
        reason: 'NOT_IN_DS_LIST',
        rawResponse: data
      })
    }

    // Verificar se é produto Choice
    const properties = result.ae_item_properties?.ae_item_property || []
    const choiceProperty = properties.find((p: any) => 
      p.attr_name?.toLowerCase() === 'choice' && p.attr_value?.toLowerCase() === 'yes'
    )
    const isChoice = !!choiceProperty

    // Verificar se está disponível
    const productInfo = {
      productId: result.ae_item_base_info_dto?.product_id,
      title: result.ae_item_base_info_dto?.subject,
      status: result.ae_item_base_info_dto?.product_status_type,
      isAvailable: result.ae_item_base_info_dto?.product_status_type === 'onSelling',
      categoryId: result.ae_item_base_info_dto?.category_id,
      currency: result.ae_item_base_info_dto?.currency_code,
      isChoice,
    }

    // Extrair SKUs disponíveis
    const skuList = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
    const skus = skuList.map((sku: any) => ({
      skuId: sku.sku_id,
      skuAttr: sku.sku_attr,
      price: sku.offer_sale_price || sku.sku_price,
      stock: sku.sku_stock ? 'Em estoque' : 'Sem estoque',
      available: sku.sku_available_stock > 0 || sku.sku_stock === true,
    }))

    // Extrair imagens
    const images = result.ae_multimedia_info_dto?.image_urls?.split(';') || []

    return NextResponse.json({ 
      success: true,
      available: productInfo.isAvailable,
      isChoice,
      message: productInfo.isAvailable 
        ? `Produto disponível para DS!${isChoice ? ' ⭐ CHOICE' : ''}` 
        : 'Produto não está à venda',
      productInfo,
      skus,
      images: images.slice(0, 5),
      skuCount: skus.length,
      rawResponse: result
    })

  } catch (error: any) {
    console.error('[Test DS Product] Erro:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Erro ao verificar produto',
      available: false
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
