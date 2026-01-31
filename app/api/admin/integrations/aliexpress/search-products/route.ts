import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// API para buscar produtos sem importar (só preview)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { keywords, categoryId, sortBy = 'SALE_PRICE_ASC' } = await req.json()

    if (!keywords?.trim()) {
      return NextResponse.json({ 
        success: false,
        error: 'Palavra-chave é obrigatória' 
      })
    }

    // Buscar credenciais do AliExpress
    const auth = await prisma.aliExpressAuth.findUnique({
      where: { userId: session.user.id }
    })

    if (!auth?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Credenciais do AliExpress não configuradas'
      })
    }

    // Função para gerar assinatura
    function generateSign(appSecret: string, params: Record<string, any>): string {
      const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
      const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
      const signature = crypto.createHmac('sha256', appSecret)
        .update(signString)
        .digest('hex')
        .toUpperCase()
      return signature
    }

    // Buscar produtos da API AliExpress
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    const params: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.text.search',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      keywords: keywords.trim(),
      countryCode: 'BR',
      currency: 'BRL',
      language: 'pt',
      local: 'pt_BR',
      page_no: '1',
      page_size: '20',
      sort: sortBy,
      ship_to_country: 'BR',
      min_price: '5',
    }

    if (categoryId) {
      params.category_id = categoryId
    }

    const sign = generateSign(auth.appSecret, params)
    params['sign'] = sign

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(params).toString()
    })

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`)
    }

    const data = await response.json()

    if (data.error_response) {
      throw new Error(data.error_response.msg || 'Erro da API AliExpress')
    }

    // Extrair produtos da resposta
    let products = []
    if (data.aliexpress_ds_text_search_response?.data?.products?.selection_search_product) {
      products = data.aliexpress_ds_text_search_response.data.products.selection_search_product
    }

    // Mapear para formato simples
    const formattedProducts = products.map((product: any) => ({
      product_id: product.itemId?.toString() || '',
      product_title: product.title || '',
      product_main_image_url: product.itemMainPic || '',
      target_sale_price: product.targetSalePrice || '0',
      target_original_price: product.targetOriginalPrice || null,
      product_detail_url: product.itemUrl || '',
    }))

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      total: formattedProducts.length
    })

  } catch (error: any) {
    console.error('Erro na busca de produtos:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    })
  }
}