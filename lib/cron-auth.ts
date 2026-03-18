import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helper'

/**
 * Verifica se a requisição é autorizada para rodar jobs/cron:
 * - Header Authorization: Bearer <CRON_SECRET>
 * - OU sessão autenticada de Admin/AdminStaff (NextAuth)
 */
export async function verifyCronOrAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecretHeader = request.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

  // CRON jobs can send either:
  // - Authorization: Bearer <secret>
  // - x-cron-secret: <secret>
  if (
    authHeader === `Bearer ${cronSecret}` ||
    cronSecretHeader === cronSecret
  ) {
    return { ok: true }
  }

  const auth = await authenticateRequest(request, {
    requireApiKey: false,
    requireAuth: true,
    allowedRoles: ['ADMIN']
  })

  if (!auth.authenticated) {
    return { ok: false, response: auth.response }
  }

  // Permitindo também funcionários (isAdminStaff) mesmo que não sejam ADMIN
  const isStaff = (auth as any).user?.isAdminStaff === true
  if (auth.user?.role !== 'ADMIN' && !isStaff) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Acesso negado - somente administradores podem executar este job' },
        { status: 403 }
      )
    }
  }

  return { ok: true }
}
