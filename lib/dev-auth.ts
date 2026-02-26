import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────
// SCOPES disponíveis
// ─────────────────────────────────────────
export const SCOPES = {
  'orders:read':          'Visualizar pedidos',
  'orders:write':         'Atualizar status de pedidos',
  'labels:read':          'Baixar etiquetas de envio',
  'invoices:read':        'Acessar notas fiscais',
  'products:read':        'Listar produtos e estoque',
  'shipping:calculate':   'Calcular frete',
  'webhooks:manage':      'Criar e gerenciar webhooks',
} as const

export type Scope = keyof typeof SCOPES

// Mapa de rota → scope obrigatório
export const ROUTE_SCOPES: Record<string, Scope> = {
  'GET /api/v1/orders':               'orders:read',
  'GET /api/v1/orders/[id]':          'orders:read',
  'PATCH /api/v1/orders/[id]/status': 'orders:write',
  'GET /api/v1/labels/[id]':          'labels:read',
  'GET /api/v1/invoices/[id]':        'invoices:read',
  'GET /api/v1/products':             'products:read',
  'GET /api/v1/products/[id]':        'products:read',
  'POST /api/v1/shipping/calculate':  'shipping:calculate',
  'GET /api/v1/webhooks':             'webhooks:manage',
  'POST /api/v1/webhooks':            'webhooks:manage',
  'DELETE /api/v1/webhooks/[id]':     'webhooks:manage',
}

// ─────────────────────────────────────────
// Resultado da validação
// ─────────────────────────────────────────
export interface DevAuthResult {
  valid: boolean
  appId?: string
  keyId?: string
  keyPrefix?: string
  scopes?: string[]
  error?: string
  statusCode?: number
}

// ─────────────────────────────────────────
// Validar API Key + Secret (HMAC-SHA256)
//
// O cliente deve enviar no header:
//   Authorization: Bearer <api_key>
//   X-Api-Signature: <hmac>
//   X-Timestamp: <unix_timestamp_ms>
//
// HMAC = SHA256(api_key + ":" + timestamp, api_secret)
// ─────────────────────────────────────────
export async function validateDevAuth(req: NextRequest): Promise<DevAuthResult> {
  const authHeader = req.headers.get('authorization')
  const signature  = req.headers.get('x-api-signature')
  const timestamp  = req.headers.get('x-timestamp')

  // ── 1. Verificar presença dos headers ──
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Header Authorization ausente ou inválido', statusCode: 401 }
  }
  if (!signature || !timestamp) {
    return { valid: false, error: 'Headers X-Api-Signature e X-Timestamp são obrigatórios', statusCode: 401 }
  }

  // ── 2. Verificar janela de tempo (±5 minutos) ──
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return { valid: false, error: 'Timestamp inválido ou expirado (janela de 5 minutos)', statusCode: 401 }
  }

  const rawKey = authHeader.replace('Bearer ', '').trim()

  // ── 3. Hash SHA-256 da api_key para lookup no banco ──
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex')

  let apiKeyRecord: any
  try {
    apiKeyRecord = await prisma.developerApiKey.findUnique({
      where: { apiKey: hashedKey },
      include: { app: { select: { id: true, status: true } } }
    })
  } catch {
    return { valid: false, error: 'Erro interno de autenticação', statusCode: 500 }
  }

  if (!apiKeyRecord) {
    return { valid: false, error: 'API Key inválida', statusCode: 401 }
  }

  // ── 4. Verificar se está ativa e app ativo ──
  if (!apiKeyRecord.isActive) {
    return { valid: false, error: 'API Key desativada', statusCode: 401 }
  }
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return { valid: false, error: 'API Key expirada', statusCode: 401 }
  }
  if (apiKeyRecord.app.status !== 'ACTIVE') {
    return { valid: false, error: 'Aplicativo suspenso ou desativado', statusCode: 403 }
  }

  // ── 5. Verificar assinatura HMAC ──
  // Formato: HMAC-SHA256(apiSecret, timestamp)
  // A janela de 5 minutos previne replay attacks
  const expectedHmac = crypto
    .createHmac('sha256', apiKeyRecord.apiSecret)
    .update(timestamp)
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))) {
    return { valid: false, error: 'Assinatura inválida', statusCode: 401 }
  }

  // ── 6. Atualizar contador e lastUsedAt (fire-and-forget) ──
  prisma.developerApiKey.update({
    where: { id: apiKeyRecord.id },
    data: {
      lastUsedAt: new Date(),
      requestCount: { increment: 1 }
    }
  }).catch(() => {})

  return {
    valid: true,
    appId: apiKeyRecord.app.id,
    keyId: apiKeyRecord.id,
    keyPrefix: apiKeyRecord.keyPrefix,
    scopes: apiKeyRecord.scopes as string[],
  }
}

// ─────────────────────────────────────────
// Verificar se o resultado tem o scope necessário
// ─────────────────────────────────────────
export function hasScope(auth: DevAuthResult, required: Scope): boolean {
  return auth.scopes?.includes(required) ?? false
}

// ─────────────────────────────────────────
// Helper: retorna erro JSON padronizado
// ─────────────────────────────────────────
export function devAuthError(message: string, statusCode = 401): NextResponse {
  return NextResponse.json(
    { error: message, docs: 'https://gerencial-sys.mydshop.com.br/developer/docs' },
    { status: statusCode }
  )
}

// ─────────────────────────────────────────
// Logar chamada na tabela dev_api_log
// ─────────────────────────────────────────
export async function logDevApiCall(params: {
  appId: string
  keyPrefix: string
  method: string
  path: string
  statusCode: number
  latencyMs: number
  ipAddress?: string
  userAgent?: string
  error?: string
}) {
  try {
    await prisma.devApiLog.create({ data: params })
  } catch {
    // Log não deve bloquear a resposta
  }
}
