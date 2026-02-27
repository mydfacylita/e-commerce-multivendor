/**
 * 🚦 RATE LIMIT PERSISTENTE
 * ISO 27001 A.12.6 — Gestão de vulnerabilidades técnicas
 *
 * Substitui o cache em memória (`Map`) para endpoints críticos.
 * Persiste no banco de dados — sobrevive a restarts do pm2.
 *
 * Para APIs de alta frequência (produtos, busca): usar in-memory (OK).
 * Para endpoints críticos (login, reset senha, MFA): usar este módulo.
 */

import { prisma } from './prisma'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfterSeconds: number
}

/**
 * Verifica e incrementa o contador de rate limit para uma chave.
 *
 * @param key        Identificador único ex: "login:email@x.com" | "reset:ip:1.2.3.4"
 * @param maxRequests Número máximo de requisições no período
 * @param windowMs    Período em milissegundos
 */
export async function checkRateLimitDb(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMs)

  try {
    // Upsert: cria ou incrementa o contador
    const entry = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimitEntry.findUnique({ where: { key } })

      if (!existing || existing.resetAt < now) {
        // Entrada expirada ou nova — resetar
        return tx.rateLimitEntry.upsert({
          where: { key },
          create: { key, count: 1, resetAt },
          update: { count: 1, resetAt },
        })
      }

      // Incrementar
      return tx.rateLimitEntry.update({
        where: { key },
        data: { count: { increment: 1 } },
      })
    })

    const remaining = Math.max(0, maxRequests - entry.count)
    const allowed = entry.count <= maxRequests
    const retryAfterSeconds = allowed
      ? 0
      : Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)

    return { allowed, remaining, resetAt: entry.resetAt, retryAfterSeconds }
  } catch (err) {
    // Em caso de falha no DB, permitir (fail-open) para não bloquear usuários legítimos
    console.error('[RateLimitDb] Erro ao verificar rate limit:', err)
    return { allowed: true, remaining: maxRequests, resetAt, retryAfterSeconds: 0 }
  }
}

/**
 * Reseta o contador de rate limit para uma chave.
 * Chamar após login bem-sucedido para desbloquear o usuário.
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimitEntry.deleteMany({ where: { key } })
  } catch (err) {
    console.error('[RateLimitDb] Erro ao resetar rate limit:', err)
  }
}

/**
 * Headers HTTP padrão para rate limiting (X-RateLimit-*)
 */
export function rateLimitHeaders(result: RateLimitResult, maxRequests: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt.getTime() / 1000)),
    ...(result.retryAfterSeconds > 0 ? { 'Retry-After': String(result.retryAfterSeconds) } : {}),
  }
}
