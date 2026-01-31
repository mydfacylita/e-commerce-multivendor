import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface AliExpressProductInfo {
  storeName: string
  storeId: string
  stock: number
  isChoiceProduct: boolean
  availableForDropship: boolean
  storeRating: number
  shippingSpeed: number
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { productId } = await req.json()

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { supplier: true }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    if (!product.supplierSku) {
      return NextResponse.json(
        { message: 'Produto não tem SKU do fornecedor' },
        { status: 400 }
      )
    }

    // Buscar credenciais do AliExpress
    const aliexpressAuth = await prisma.aliExpressAuth.findFirst({
      where: { userId: session.user.id }
    })

    if (!aliexpressAuth) {
      return NextResponse.json(
        { message: 'Credenciais AliExpress não configuradas' },
        { status: 400 }
      )
    }

    // Buscar informações do produto no AliExpress
    const productInfo = await fetchAliExpressProductInfo(
      product.supplierSku,
      aliexpressAuth.appKey,
      aliexpressAuth.appSecret,
      aliexpressAuth.accessToken
    )

    // Atualizar produto com as informações
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        supplierStoreName: productInfo.storeName,
        supplierStoreId: productInfo.storeId,
        supplierStock: productInfo.stock,
        isChoiceProduct: productInfo.isChoiceProduct,
        availableForDropship: productInfo.availableForDropship,
        supplierRating: productInfo.storeRating,
        supplierShippingSpeed: productInfo.shippingSpeed,
        lastSyncAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      info: productInfo
    })

  } catch (error: any) {
    console.error('Erro ao sincronizar produto:', error)
    return NextResponse.json(
      { message: 'Erro ao sincronizar produto', error: error.message },
      { status: 500 }
    )
  }
}

async function fetchAliExpressProductInfo(
  productId: string,
  appKey: string,
  appSecret: string,
  accessToken: string | null
): Promise<AliExpressProductInfo> {
  const timestamp = Date.now().toString()
  
  const params: Record<string, string> = {
    app_key: appKey,
    method: 'aliexpress.ds.product.get',
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    timestamp,
    product_id: productId,
    target_currency: 'BRL',
    target_language: 'pt'
  }

  if (accessToken) {
    params.session = accessToken
  }

  // Gerar assinatura
  const sortedKeys = Object.keys(params).sort()
  let signString = appSecret
  sortedKeys.forEach(key => {
    signString += key + params[key]
  })
  signString += appSecret

  const sign = crypto
    .createHash('sha256')
    .update(signString, 'utf8')
    .digest('hex')
    .toUpperCase()

  params.sign = sign

  // Construir URL
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')

  const url = `https://api-sg.aliexpress.com/sync?${queryString}`

  console.log('[AliExpress Sync] Buscando produto:', productId)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`AliExpress API error: ${response.status}`)
  }

  const data = await response.json()
  console.log('[AliExpress Sync] Resposta:', JSON.stringify(data, null, 2))

  if (data.error_response) {
    throw new Error(`AliExpress API error: ${data.error_response.msg}`)
  }

  const result = data.aliexpress_ds_product_get_response?.result

  if (!result) {
    throw new Error('Resposta inválida da API AliExpress')
  }

  // Verificar se é produto Choice/Selection
  const isChoiceProduct = result.ae_item_properties?.ae_item_property?.some(
    (prop: any) => prop.attr_name === 'Choice' && prop.attr_value === 'yes'
  ) || false

  // Informações da loja
  const storeInfo = result.ae_store_info || {}

  return {
    storeName: storeInfo.store_name || 'Desconhecida',
    storeId: storeInfo.store_id?.toString() || '',
    stock: result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0]?.s_k_u_available_stock || 0,
    isChoiceProduct,
    availableForDropship: !isChoiceProduct, // Choice products não funcionam com dropship API
    storeRating: parseFloat(storeInfo.item_as_described_rating || '0'),
    shippingSpeed: parseFloat(storeInfo.shipping_speed_rating || '0')
  }
}
