import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Testar API aliexpress.ds.product.get
 * Esta API retorna informações de qualquer produto público do AliExpress
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { productId } = await req.json()

    // Buscar credenciais
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      return NextResponse.json({
        error: 'Credenciais AliExpress não configuradas'
      }, { status: 400 })
    }

    const crypto = require('crypto')
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Parâmetros para product.get
    const params: Record<string, any> = {
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
      ship_to_country: 'BR', // OBRIGATÓRIO para ds.product.get
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

    console.log('[Test Product] Chamando API:', params.method)
    console.log('[Test Product] Product ID:', productId)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await response.json()

    console.log('[Test Product] Resposta:', JSON.stringify(data, null, 2))

    // Debug preços
    if (data.aliexpress_ds_product_get_response?.result) {
      const result = data.aliexpress_ds_product_get_response.result
      const skus = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
      const skuList = Array.isArray(skus) ? skus : [skus]
      
      console.log('\n💰 [Debug Preços] Produto:', productId)
      skuList.slice(0, 3).forEach((sku: any, i: number) => {
        console.log(`   SKU ${i + 1}:`, {
          sku_id: sku.sku_id,
          offer_sale_price: sku.offer_sale_price,
          sku_price: sku.sku_price,
          sku_bulk_order_price: sku.sku_bulk_order_price,
          currency: sku.currency_code || result.ae_item_base_info_dto?.currency_code,
        })
      })
    }

    // Analisar resposta
    let found = false
    let message = ''
    let productName = ''
    let skuCount = 0

    if (data.aliexpress_ds_product_get_response?.result) {
      found = true
      const result = data.aliexpress_ds_product_get_response.result
      productName = result.ae_item_base_info_dto?.subject || 'N/A'
      
      const skus = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
      skuCount = Array.isArray(skus) ? skus.length : 0
      
      message = `✅ Produto encontrado: ${productName} (${skuCount} SKUs)`
    } else if (data.error_response) {
      message = `❌ Erro: ${data.error_response.msg}`
    } else {
      message = '❌ Produto não encontrado'
    }

    return NextResponse.json({
      success: true,
      found,
      message,
      productName,
      skuCount,
      data,
    })

  } catch (error: any) {
    console.error('[Test Product] Erro:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
