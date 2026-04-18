/**
 * lib/shopee.ts — Cliente centralizado para Shopee Open Platform API v2
 *
 * Todos os endpoints usam assinatura HMAC-SHA256:
 *   sign = HMAC-SHA256(partnerKey, partnerId + endpoint + timestamp + accessToken + shopId)
 *
 * Endpoints GET: params via query string
 * Endpoints POST: params via JSON body
 */

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ShopeeAuth {
  id: string
  partnerId: number
  partnerKey: string
  shopId: number
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
  isSandbox: boolean
}

export interface ShopeeAddress {
  name: string
  phone: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

// ─── Base ─────────────────────────────────────────────────────────────────────

function baseUrl(auth: ShopeeAuth): string {
  return auth.isSandbox
    ? 'https://partner.test-stable.shopeemobile.com'
    : 'https://partner.shopeemobile.com'
}

function sign(auth: ShopeeAuth, endpoint: string, timestamp: number): string {
  const base = `${auth.partnerId}${endpoint}${timestamp}${auth.accessToken}${auth.shopId}`
  return crypto.createHmac('sha256', auth.partnerKey).update(base).digest('hex')
}

export async function shopeeGet(auth: ShopeeAuth, endpoint: string, params: Record<string, string | number> = {}): Promise<any> {
  const timestamp = Math.floor(Date.now() / 1000)
  const qs = new URLSearchParams({
    partner_id: String(auth.partnerId),
    timestamp: String(timestamp),
    sign: sign(auth, endpoint, timestamp),
    access_token: auth.accessToken,
    shop_id: String(auth.shopId),
  })
  for (const [k, v] of Object.entries(params)) qs.append(k, String(v))

  const url = `${baseUrl(auth)}${endpoint}?${qs.toString()}`
  const res = await fetch(url, { method: 'GET' })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Shopee GET ${endpoint} HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
}

export async function shopeePost(auth: ShopeeAuth, endpoint: string, body: Record<string, any> = {}): Promise<any> {
  const timestamp = Math.floor(Date.now() / 1000)
  const qs = new URLSearchParams({
    partner_id: String(auth.partnerId),
    timestamp: String(timestamp),
    sign: sign(auth, endpoint, timestamp),
    access_token: auth.accessToken,
    shop_id: String(auth.shopId),
  })

  const url = `${baseUrl(auth)}${endpoint}?${qs.toString()}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Shopee POST ${endpoint} HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Busca auth ativa do DB (produção preferida sobre sandbox) */
export async function getShopeeAuth(): Promise<ShopeeAuth> {
  const auth = (await prisma.shopeeAuth.findFirst({ where: { isSandbox: false } }))
    ?? (await prisma.shopeeAuth.findFirst())
  if (!auth) throw new Error('Autenticação Shopee não encontrada. Configure em Integrações.')
  if (auth.expiresAt && auth.expiresAt < new Date()) {
    throw new Error('Token Shopee expirado. Reautentique em Integrações.')
  }
  return auth as ShopeeAuth
}

// ─── Order APIs ───────────────────────────────────────────────────────────────

/** v2.order.get_order_list — Lista pedidos por status e período */
export async function getOrderList(auth: ShopeeAuth, params: {
  time_range_field: 'create_time' | 'update_time'
  time_from: number
  time_to: number
  page_size?: number
  cursor?: string
  order_status?: string
}) {
  return shopeeGet(auth, '/api/v2/order/get_order_list', {
    ...params,
    page_size: params.page_size ?? 100,
  })
}

/** v2.order.get_order_detail — Detalhes de pedidos (até 50 por chamada) */
export async function getOrderDetail(auth: ShopeeAuth, orderSnList: string[], optionalFields?: string) {
  return shopeeGet(auth, '/api/v2/order/get_order_detail', {
    order_sn_list: orderSnList.join(','),
    response_optional_fields: optionalFields ?? 'buyer_user_id,buyer_username,recipient_address,actual_shipping_fee,item_list',
  })
}

/** v2.order.get_shipment_list — Lista pedidos prontos para envio */
export async function getShipmentList(auth: ShopeeAuth, params: {
  cursor?: string
  page_size?: number
} = {}) {
  return shopeeGet(auth, '/api/v2/order/get_shipment_list', {
    page_size: params.page_size ?? 100,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  })
}

// ─── Payment / Escrow (endereço real sem máscara) ─────────────────────────────

/** v2.payment.get_escrow_detail — Dados financeiros + endereço real do comprador */
export async function getOrderEscrowDetail(auth: ShopeeAuth, orderSn: string) {
  return shopeeGet(auth, '/api/v2/payment/get_escrow_detail', {
    order_sn: orderSn,
  })
}

/** Extrai e normaliza o endereço real do escrow (sem máscaras) */
export function extractEscrowAddress(escrowData: any): ShopeeAddress | null {
  const addr = escrowData?.response?.recipient_address ?? escrowData?.response?.order_income?.recipient_address
  if (!addr) return null
  return {
    name: addr.name ?? '',
    phone: addr.phone ?? '',
    street: addr.full_address ?? addr.address ?? '',
    city: addr.city ?? '',
    state: addr.state ?? '',
    zipCode: addr.zipcode ?? addr.zip ?? '',
    country: addr.region ?? 'BR',
  }
}

// ─── Logistics APIs ───────────────────────────────────────────────────────────

/** v2.logistics.get_shipping_document_parameter — Parâmetros necessários para gerar etiqueta */
export async function getShippingDocumentParameter(auth: ShopeeAuth, orderList: { order_sn: string; package_number?: string }[]) {
  return shopeePost(auth, '/api/v2/logistics/get_shipping_document_parameter', {
    order_list: orderList,
  })
}

/** v2.logistics.upload_invoice — Envia chave de acesso da NF-e para um pedido */
export async function uploadInvoice(auth: ShopeeAuth, orderSn: string, invoiceKey: string) {
  return shopeePost(auth, '/api/v2/logistics/upload_invoice', {
    order_sn: orderSn,
    invoice_number: invoiceKey,
  })
}

/** v2.logistics.init_shipment — Inicializa envio (etapa obrigatória antes de ship_order) */
export async function initShipment(auth: ShopeeAuth, orderSn: string, params: {
  pickup?: { address_id: number; pickup_time_id: string; tracking_number?: string }
  dropoff?: { branch_id?: number; sender_real_name?: string; tracking_number?: string; slug?: string }
  non_integrated?: { tracking_number: string }
}) {
  return shopeePost(auth, '/api/v2/logistics/init_shipment', {
    order_sn: orderSn,
    ...params,
  })
}

/** v2.logistics.create_shipping_document — Cria etiqueta de envio (pode ser para múltiplos pedidos) */
export async function createShippingDocument(auth: ShopeeAuth, orderList: {
  order_sn: string
  package_number?: string
  tracking_number?: string
  shipping_document_type?: 'NORMAL_AIR_WAYBILL' | 'THERMAL_AIR_WAYBILL' | 'A4_AIR_WAYBILL' | 'MINI_AIR_WAYBILL'
}[]) {
  return shopeePost(auth, '/api/v2/logistics/create_shipping_document', {
    order_list: orderList,
  })
}

/** v2.logistics.download_shipping_document — Baixa PDF da etiqueta (retorna base64 ou URL) */
export async function downloadShippingDocument(auth: ShopeeAuth, orderList: {
  order_sn: string
  package_number?: string
  shipping_document_type?: string
}[]) {
  return shopeePost(auth, '/api/v2/logistics/download_shipping_document', {
    order_list: orderList,
  })
}

/** v2.logistics.get_tracking_number — Obtém código de rastreio de um pedido */
export async function getTrackingNumber(auth: ShopeeAuth, orderSn: string, packageNumber?: string) {
  return shopeeGet(auth, '/api/v2/logistics/get_tracking_number', {
    order_sn: orderSn,
    ...(packageNumber ? { package_number: packageNumber } : {}),
  })
}

/** v2.logistics.ship_order — Confirma envio do pedido (muda status para SHIPPED) */
export async function shipOrder(auth: ShopeeAuth, orderSn: string, params: {
  pickup?: { branch_id?: number; sender_real_name?: string; tracking_number?: string }
  dropoff?: { branch_id?: number; sender_real_name?: string; tracking_number?: string }
  non_integrated?: { tracking_number: string }
} = {}) {
  return shopeePost(auth, '/api/v2/logistics/ship_order', {
    order_sn: orderSn,
    ...params,
  })
}

/** v2.logistics.get_channel_list — Lista transportadoras disponíveis para o seller */
export async function getLogisticsChannelList(auth: ShopeeAuth) {
  return shopeeGet(auth, '/api/v2/logistics/get_channel_list', {})
}

// ─── Utilitário: verificar erro na resposta ───────────────────────────────────

export function assertShopeeSuccess(data: any, context: string): void {
  if (data?.error && data.error !== '') {
    throw new Error(`[Shopee ${context}] ${data.error}: ${data.message ?? ''}`)
  }
}
