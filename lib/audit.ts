/**
 * 🔍 AUDIT LOG HELPER
 * ISO 27001 Controle A.12.4 — Logging e Monitoramento
 *
 * Registra todas as ações sensíveis para trilha de auditoria.
 * Obrigatório para ISO 27001 / LGPD Art.6 VIII.
 */

import { prisma } from './prisma'
import { headers } from 'next/headers'

export type AuditAction =
  // Autenticação
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_FAILED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  // Conta
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_UPDATED'
  | 'ACCOUNT_BLOCKED'
  | 'ACCOUNT_UNBLOCKED'
  | 'ACCOUNT_DELETED'         // LGPD Art.18
  | 'DATA_EXPORT_REQUESTED'   // LGPD Art.18 portabilidade
  // Pedidos
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'ORDER_REFUND_REQUESTED'
  | 'ORDER_REFUND_APPROVED'
  // Financeiro
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'PAYMENT_PROCESSED'
  // Produtos
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'PRODUCT_PUBLISHED'
  | 'PRODUCT_APPROVED'
  | 'PRODUCT_REJECTED'
  // Configurações do sistema
  | 'CONFIG_CHANGED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  // Integrações
  | 'MARKETPLACE_CONNECTED'
  | 'MARKETPLACE_DISCONNECTED'
  // Segurança
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ACCESS'
  | 'FORBIDDEN_ACCESS'
  | 'SUSPICIOUS_ACTIVITY'

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'WARNING'

export interface AuditLogData {
  userId: string
  action: AuditAction
  resource?: string
  resourceId?: string
  status: AuditStatus
  details?: Record<string, unknown> | string
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra uma entrada no AuditLog.
 * Fire-and-forget — não bloqueia a requisição em caso de erro.
 */
export async function auditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        status: data.status,
        details: typeof data.details === 'object'
          ? JSON.stringify(data.details)
          : data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    })
  } catch (err) {
    // Nunca deve quebrar a requisição principal
    console.error('[AuditLog] Falha ao gravar log:', err)
  }
}

/**
 * Cria helper de audit já preenchido com IP e User-Agent da requisição.
 * Usar dentro de route handlers do Next.js (App Router).
 */
export function createAuditHelper(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'

  return {
    log: (data: Omit<AuditLogData, 'ipAddress' | 'userAgent'>) =>
      auditLog({ ...data, ipAddress: ip, userAgent }),
    ip,
    userAgent,
  }
}

/**
 * Conta tentativas de login falhadas recentes para um userId.
 * ISO 27001 A.9.4 — bloqueio após falhas repetidas.
 */
export async function countFailedLogins(userId: string, windowMinutes = 15): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000)
  return prisma.auditLog.count({
    where: {
      userId,
      action: 'LOGIN_FAILED',
      status: 'FAILURE',
      createdAt: { gte: since },
    }
  })
}
