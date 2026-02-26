import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// =====================================================
// Shopify Partners App — Helper Library
// =====================================================

export interface ShopifyConfig {
  apiKey:    string
  apiSecret: string
  scopes:    string
  appUrl:    string
}

/**
 * Lê as credenciais do Shopify Partners diretamente do banco de dados (SystemConfig).
 * Chaves: shopify.apiKey, shopify.apiSecret, shopify.scopes
 * Fallback para env vars em desenvolvimento.
 */
export async function getShopifyConfig(): Promise<ShopifyConfig> {
  const [keyRow, secretRow, scopesRow] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'shopify.apiKey' } }),
    prisma.systemConfig.findUnique({ where: { key: 'shopify.apiSecret' } }),
    prisma.systemConfig.findUnique({ where: { key: 'shopify.scopes' } }),
  ])

  return {
    apiKey:    keyRow?.value    || process.env.SHOPIFY_API_KEY    || '',
    apiSecret: secretRow?.value || process.env.SHOPIFY_API_SECRET || '',
    scopes:    scopesRow?.value || process.env.SHOPIFY_SCOPES     || 'read_orders,write_orders,read_products,write_products,read_customers',
    appUrl:    process.env.NEXTAUTH_URL || 'https://mydshop.com.br',
  }
}

// Constantes estáticas
const APP_URL = process.env.NEXTAUTH_URL || 'https://mydshop.com.br'
void APP_URL // used in old fallback paths only

// =====================================================
// HMAC Validation
// =====================================================

/**
 * Valida HMAC nos query params da requisição Shopify.
 * Remove o campo `hmac`, ordena o restante, assina com SHA256.
 */
export function validateShopifyHmac(
  query: Record<string, string | string[]>,
  secret: string
): boolean {
  const { hmac, signature: _sig, ...rest } = query as Record<string, string>

  if (!hmac) return false

  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&')

  const digest = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac))
}

/**
 * Valida HMAC de webhook (header X-Shopify-Hmac-Sha256 em base64).
 */
export function validateWebhookHmac(body: string, rawHmac: string, secret: string): boolean {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(rawHmac))
  } catch {
    return false
  }
}

// =====================================================
// Install URL builder
// =====================================================

/**
 * Gera a URL de autorização OAuth para o lojista instalar o app Mydshop na sua loja Shopify.
 */
export function buildInstallUrl(shop: string, state: string, config: ShopifyConfig): string {
  const redirect = `${config.appUrl}/api/shopify/callback`
  const params = new URLSearchParams({
    client_id: config.apiKey,
    scope:     config.scopes,
    redirect_uri: redirect,
    state,
    'grant_options[]': 'per-user',
  })
  return `https://${sanitizeShopDomain(shop)}/admin/oauth/authorize?${params.toString()}`
}

// =====================================================
// Token exchange
// =====================================================

export interface ShopifyTokenResponse {
  access_token: string
  scope: string
  expires_in?: number
  associated_user_scope?: string
  associated_user?: { id: number; email: string; first_name: string; last_name: string }
}

/**
 * Troca o código de autorização pelo access_token permanente da loja.
 */
export async function exchangeAccessToken(shop: string, code: string, config: ShopifyConfig): Promise<ShopifyTokenResponse> {
  const res = await fetch(`https://${sanitizeShopDomain(shop)}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     config.apiKey,
      client_secret: config.apiSecret,
      code,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify token exchange failed: ${res.status} ${err}`)
  }

  return res.json()
}

// =====================================================
// Shopify Admin REST API helper
// =====================================================

export async function shopifyAdminFetch<T = any>(
  shop: string,
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://${sanitizeShopDomain(shop)}/admin/api/2026-01/${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify API ${endpoint} failed: ${res.status} ${err}`)
  }

  return res.json()
}

// =====================================================
// Shop info
// =====================================================

export interface ShopifyShopInfo {
  name: string
  email: string
  plan_name: string
  currency: string
  iana_timezone: string
  domain: string
  myshopify_domain: string
}

export async function getShopInfo(shop: string, accessToken: string): Promise<ShopifyShopInfo> {
  const data = await shopifyAdminFetch<{ shop: ShopifyShopInfo }>(shop, accessToken, 'shop.json')
  return data.shop
}

// =====================================================
// Orders
// =====================================================

export interface ShopifyOrder {
  id: number
  order_number: number
  email: string
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  financial_status: string
  fulfillment_status: string | null
  created_at: string
  updated_at: string
  name: string
  note: string | null
  billing_address: ShopifyAddress | null
  shipping_address: ShopifyAddress | null
  line_items: ShopifyLineItem[]
  customer: { id: number; email: string; first_name: string; last_name: string; phone: string } | null
  shipping_lines: { title: string; price: string; code: string }[]
}

export interface ShopifyAddress {
  first_name: string
  last_name: string
  address1: string
  address2: string | null
  city: string
  province: string
  country: string
  zip: string
  phone: string | null
  company: string | null
}

export interface ShopifyLineItem {
  id: number
  variant_id: number
  product_id: number
  title: string
  quantity: number
  price: string
  sku: string
  variant_title: string | null
}

export async function getShopifyOrders(
  shop: string,
  accessToken: string,
  params: { since_id?: string; limit?: number; status?: string; created_at_min?: string } = {}
): Promise<ShopifyOrder[]> {
  const qs = new URLSearchParams({
    limit: String(params.limit || 250),
    status: params.status || 'any',
    ...(params.since_id      ? { since_id: params.since_id }           : {}),
    ...(params.created_at_min ? { created_at_min: params.created_at_min } : {}),
  })
  const data = await shopifyAdminFetch<{ orders: ShopifyOrder[] }>(shop, accessToken, `orders.json?${qs}`)
  return data.orders
}

// =====================================================
// Products (push Mydshop → Shopify)
// =====================================================

export interface ShopifyProductPayload {
  title: string
  body_html?: string
  vendor?: string
  product_type?: string
  variants: { price: string; sku?: string; inventory_quantity?: number; requires_shipping?: boolean }[]
  images?: { src: string }[]
  status?: 'active' | 'draft' | 'archived'
}

export interface ShopifyProduct {
  id: number
  title: string
  body_html: string | null
  vendor: string
  product_type: string
  status: string
  created_at: string
  updated_at: string
  images: { id: number; src: string }[]
  variants: {
    id: number
    title: string
    price: string
    sku: string | null
    inventory_quantity: number
    requires_shipping: boolean
  }[]
}

export async function getShopifyProducts(
  shop: string,
  accessToken: string,
  params: { limit?: number; since_id?: string; status?: string } = {}
): Promise<ShopifyProduct[]> {
  const qs = new URLSearchParams({
    limit: String(params.limit || 250),
    status: params.status || 'active',
    ...(params.since_id ? { since_id: params.since_id } : {}),
  })
  const data = await shopifyAdminFetch<{ products: ShopifyProduct[] }>(shop, accessToken, `products.json?${qs}`)
  return data.products
}

export async function createShopifyProduct(
  shop: string,
  accessToken: string,
  payload: ShopifyProductPayload
): Promise<{ id: number; variants: { id: number }[] }> {
  const data = await shopifyAdminFetch<{ product: any }>(shop, accessToken, 'products.json', {
    method: 'POST',
    body: JSON.stringify({ product: payload }),
  })
  return data.product
}

export async function updateShopifyProduct(
  shop: string,
  accessToken: string,
  shopifyProductId: string,
  payload: Partial<ShopifyProductPayload>
): Promise<void> {
  await shopifyAdminFetch(shop, accessToken, `products/${shopifyProductId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ product: payload }),
  })
}

// =====================================================
// Utility
// =====================================================

/** Remove trailing slashes, ensure .myshopify.com or pass through custom domain */
export function sanitizeShopDomain(shop: string): string {
  return shop.trim().replace(/\/$/, '').replace(/^https?:\/\//, '')
}

/** Gera nonce aleatório para state do OAuth */
export function generateNonce(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex')
}
