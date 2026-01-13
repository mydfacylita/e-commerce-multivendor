import crypto from 'crypto'

// Configurações do TikTok Shop API
const TIKTOK_API_BASE = 'https://open-api.tiktokglobalshop.com'
const TIKTOK_AUTH_URL = 'https://services.tiktokshop.com/open/authorize'

interface TikTokConfig {
  appKey: string
  appSecret: string
  accessToken?: string
}

interface TikTokApiResponse<T = any> {
  code: number
  message: string
  data?: T
  request_id?: string
}

/**
 * Gera a assinatura HMAC-SHA256 para requisições ao TikTok Shop API
 * Seguindo a documentação: https://partner.tiktokshop.com/docv2
 */
export function generateSignature(
  path: string,
  params: Record<string, string>,
  appSecret: string,
  body?: string
): string {
  // 1. Ordenar parâmetros alfabeticamente
  const sortedKeys = Object.keys(params).sort()
  
  // 2. Construir string base: path + params + body
  let baseString = path
  
  for (const key of sortedKeys) {
    baseString += key + params[key]
  }
  
  // 3. Adicionar body se existir
  if (body) {
    baseString += body
  }
  
  // 4. Wrap com app_secret
  const stringToSign = appSecret + baseString + appSecret
  
  // 5. Gerar HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', appSecret)
    .update(stringToSign)
    .digest('hex')
  
  return signature
}

/**
 * Gera URL de autorização OAuth para TikTok Shop
 */
export function getAuthorizationUrl(appKey: string, state?: string): string {
  const params = new URLSearchParams({
    app_key: appKey,
    state: state || crypto.randomBytes(16).toString('hex'),
  })
  
  return `${TIKTOK_AUTH_URL}?${params.toString()}`
}

/**
 * Troca o código de autorização por access_token
 */
export async function getAccessToken(
  appKey: string,
  appSecret: string,
  authCode: string
): Promise<TikTokApiResponse> {
  const path = '/api/v2/token/get'
  const timestamp = Math.floor(Date.now() / 1000)
  
  const params: Record<string, string> = {
    app_key: appKey,
    timestamp: timestamp.toString(),
    grant_type: 'authorized_code',
    auth_code: authCode,
  }
  
  const sign = generateSignature(path, params, appSecret)
  
  const url = new URL(`${TIKTOK_API_BASE}${path}`)
  url.searchParams.append('app_key', appKey)
  url.searchParams.append('timestamp', timestamp.toString())
  url.searchParams.append('sign', sign)
  url.searchParams.append('grant_type', 'authorized_code')
  url.searchParams.append('auth_code', authCode)
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return response.json()
}

/**
 * Renova o access_token usando refresh_token
 */
export async function refreshAccessToken(
  appKey: string,
  appSecret: string,
  refreshToken: string
): Promise<TikTokApiResponse> {
  const path = '/api/v2/token/refresh'
  const timestamp = Math.floor(Date.now() / 1000)
  
  const params: Record<string, string> = {
    app_key: appKey,
    timestamp: timestamp.toString(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }
  
  const sign = generateSignature(path, params, appSecret)
  
  const url = new URL(`${TIKTOK_API_BASE}${path}`)
  url.searchParams.append('app_key', appKey)
  url.searchParams.append('timestamp', timestamp.toString())
  url.searchParams.append('sign', sign)
  url.searchParams.append('grant_type', 'refresh_token')
  url.searchParams.append('refresh_token', refreshToken)
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return response.json()
}

/**
 * Faz requisição autenticada ao TikTok Shop API
 */
export async function makeApiRequest(
  config: TikTokConfig,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, any>,
  shopCipher?: string
): Promise<TikTokApiResponse> {
  const timestamp = Math.floor(Date.now() / 1000)
  
  const params: Record<string, string> = {
    app_key: config.appKey,
    timestamp: timestamp.toString(),
  }
  
  if (shopCipher) {
    params.shop_cipher = shopCipher
  }
  
  const bodyString = body ? JSON.stringify(body) : undefined
  const sign = generateSignature(path, params, config.appSecret, bodyString)
  
  const url = new URL(`${TIKTOK_API_BASE}${path}`)
  url.searchParams.append('app_key', config.appKey)
  url.searchParams.append('timestamp', timestamp.toString())
  url.searchParams.append('sign', sign)
  
  if (shopCipher) {
    url.searchParams.append('shop_cipher', shopCipher)
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (config.accessToken) {
    headers['x-tts-access-token'] = config.accessToken
  }
  
  const response = await fetch(url.toString(), {
    method,
    headers,
    body: bodyString,
  })
  
  return response.json()
}

/**
 * Lista as lojas autorizadas do vendedor
 */
export async function getAuthorizedShops(config: TikTokConfig): Promise<TikTokApiResponse> {
  return makeApiRequest(config, '/authorization/202309/shops', 'GET')
}

/**
 * Lista produtos da loja
 */
export async function getProducts(
  config: TikTokConfig,
  shopCipher: string,
  pageSize: number = 20,
  pageToken?: string
): Promise<TikTokApiResponse> {
  const path = '/product/202309/products/search'
  
  const body: Record<string, any> = {
    page_size: pageSize,
  }
  
  if (pageToken) {
    body.page_token = pageToken
  }
  
  return makeApiRequest(config, path, 'POST', body, shopCipher)
}

/**
 * Obtém detalhes de um produto específico
 */
export async function getProductDetails(
  config: TikTokConfig,
  shopCipher: string,
  productId: string
): Promise<TikTokApiResponse> {
  const path = `/product/202309/products/${productId}`
  return makeApiRequest(config, path, 'GET', undefined, shopCipher)
}

/**
 * Lista pedidos da loja
 */
export async function getOrders(
  config: TikTokConfig,
  shopCipher: string,
  pageSize: number = 20,
  pageToken?: string,
  orderStatus?: string
): Promise<TikTokApiResponse> {
  const path = '/order/202309/orders/search'
  
  const body: Record<string, any> = {
    page_size: pageSize,
  }
  
  if (pageToken) {
    body.page_token = pageToken
  }
  
  if (orderStatus) {
    body.order_status = orderStatus
  }
  
  return makeApiRequest(config, path, 'POST', body, shopCipher)
}

/**
 * Obtém detalhes de um pedido específico
 */
export async function getOrderDetails(
  config: TikTokConfig,
  shopCipher: string,
  orderId: string
): Promise<TikTokApiResponse> {
  const path = `/order/202309/orders/${orderId}`
  return makeApiRequest(config, path, 'GET', undefined, shopCipher)
}

/**
 * Cria um produto na loja TikTok
 */
export async function createProduct(
  config: TikTokConfig,
  shopCipher: string,
  productData: {
    title: string
    description: string
    categoryId: string
    images: string[]
    price: number
    stock: number
    sku?: string
    weight?: number
  }
): Promise<TikTokApiResponse> {
  const path = '/product/202309/products'
  
  const body = {
    title: productData.title,
    description: productData.description,
    category_id: productData.categoryId,
    main_images: productData.images.map(url => ({ uri: url })),
    skus: [{
      sales_attributes: [],
      stock_infos: [{
        available_stock: productData.stock,
        warehouse_id: 'default',
      }],
      price: {
        amount: (productData.price * 100).toString(), // Em centavos
        currency: 'BRL',
      },
      seller_sku: productData.sku || `SKU-${Date.now()}`,
    }],
    package_weight: {
      value: (productData.weight || 0.5).toString(),
      unit: 'KILOGRAM',
    },
  }
  
  return makeApiRequest(config, path, 'POST', body, shopCipher)
}

/**
 * Atualiza estoque de um SKU
 */
export async function updateStock(
  config: TikTokConfig,
  shopCipher: string,
  productId: string,
  skuId: string,
  stock: number
): Promise<TikTokApiResponse> {
  const path = `/product/202309/products/${productId}/inventory`
  
  const body = {
    skus: [{
      id: skuId,
      stock_infos: [{
        available_stock: stock,
        warehouse_id: 'default',
      }],
    }],
  }
  
  return makeApiRequest(config, path, 'POST', body, shopCipher)
}

/**
 * Traduz códigos de erro do TikTok Shop
 */
export function translateError(code: number, message: string): string {
  const errorTranslations: Record<number, string> = {
    0: 'Sucesso',
    100000: 'Erro interno do servidor',
    100001: 'Parâmetros inválidos',
    100002: 'App key inválida',
    100003: 'Assinatura inválida',
    100004: 'Timestamp inválido',
    100005: 'Token de acesso inválido ou expirado',
    100006: 'Permissão negada',
    100007: 'Rate limit excedido',
    100008: 'Loja não encontrada',
    100009: 'Produto não encontrado',
    100010: 'Pedido não encontrado',
  }
  
  return errorTranslations[code] || message
}

/**
 * Formata status de pedido para exibição
 */
export function formatOrderStatus(status: string): {
  label: string
  color: string
  icon: string
} {
  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    'UNPAID': { label: 'Aguardando Pagamento', color: 'yellow', icon: '💳' },
    'ON_HOLD': { label: 'Em Espera', color: 'orange', icon: '⏳' },
    'AWAITING_SHIPMENT': { label: 'Aguardando Envio', color: 'blue', icon: '📦' },
    'AWAITING_COLLECTION': { label: 'Aguardando Coleta', color: 'purple', icon: '🚚' },
    'IN_TRANSIT': { label: 'Em Trânsito', color: 'indigo', icon: '🛫' },
    'DELIVERED': { label: 'Entregue', color: 'green', icon: '✅' },
    'COMPLETED': { label: 'Concluído', color: 'green', icon: '✅' },
    'CANCELLED': { label: 'Cancelado', color: 'red', icon: '❌' },
  }
  
  return statusMap[status] || { label: status, color: 'gray', icon: '❓' }
}

/**
 * Lista categorias disponíveis
 */
export async function getCategories(
  config: TikTokConfig,
  shopCipher: string,
  keyword?: string
): Promise<TikTokApiResponse> {
  const path = '/product/202309/categories'
  
  const body: Record<string, any> = {}
  
  if (keyword) {
    body.keyword = keyword
  }
  
  return makeApiRequest(config, path, 'POST', body, shopCipher)
}

/**
 * Obtém regras de atributos para uma categoria
 */
export async function getCategoryAttributes(
  config: TikTokConfig,
  shopCipher: string,
  categoryId: string
): Promise<TikTokApiResponse> {
  const path = `/product/202309/categories/${categoryId}/attributes`
  return makeApiRequest(config, path, 'GET', undefined, shopCipher)
}
