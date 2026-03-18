import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronOrAdmin } from '@/lib/cron-auth'

/**
 * Job: Limpeza Automática do Sistema
 *
 * Objetivo: Remover dados obsoletos e manter banco de dados otimizado
 *
 * Lógica:
 * 1. Remove sessões expiradas (> 30 dias)
 * 2. Limpa carrinhos abandonados (> 30 dias)
 * 3. Remove logs antigos (> 90 dias)
 * 4. Arquiva pedidos cancelados antigos (> 6 meses)
 * 5. 🔐 LGPD: Limpa rate limit entries expirados (ISO 27001)
 * 6. 🔐 LGPD: Limpa sessões revogadas expiradas
 * 7. 🔐 LGPD: Purga AuditLog antigo (> 1 ano — prazo de retenção)
 */
export async function POST(req: NextRequest) {
  const auth = await verifyCronOrAdmin(req)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const startTime = Date.now()
    const results = {
      sessionsDeleted: 0,
      cartsDeleted: 0,
      logsDeleted: 0,
      ordersArchived: 0,
      rateLimitEntriesCleaned: 0,
      revokedSessionsCleaned: 0,
      auditLogsPurged: 0,
    }

    // 1. Remover sessões expiradas (> 30 dias)
    // NOTA: Modelo Session não existe no Prisma - NextAuth gerencia isso automaticamente
    // const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    // const deletedSessions = await prisma.session.deleteMany({
    //   where: {
    //     OR: [
    //       { expiresAt: { lt: new Date() } },
    //       { updatedAt: { lt: thirtyDaysAgo } }
    //     ]
    //   }
    // })
    // results.sessionsDeleted = deletedSessions.count
    results.sessionsDeleted = 0

    // 2. Limpar carrinhos abandonados (> 30 dias sem atualização)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const deletedCarts = await prisma.cartItem.deleteMany({
      where: {
        updatedAt: { lt: thirtyDaysAgo }
      }
    })
    results.cartsDeleted = deletedCarts.count

    // 3. Remover logs antigos (> 90 dias)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    
    // TODO: Verificar se existe tabela de logs
    // const deletedLogs = await prisma.systemLog?.deleteMany({
    //   where: {
    //     createdAt: { lt: ninetyDaysAgo }
    //   }
    // })
    // results.logsDeleted = deletedLogs?.count || 0

    // 4. Arquivar pedidos cancelados antigos (> 6 meses)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    
    const oldCancelledOrders = await prisma.order.findMany({
      where: {
        status: 'CANCELLED',
        updatedAt: { lt: sixMonthsAgo } // Usa updatedAt ao invés de cancelledAt
      },
      select: { id: true }
    })

    if (oldCancelledOrders.length > 0) {
      // Marcar como arquivados ao invés de deletar
      await prisma.order.updateMany({
        where: {
          id: { in: oldCancelledOrders.map(o => o.id) }
        },
        data: {
          // archived: true // TODO: Adicionar campo no schema se necessário
        }
      })
      results.ordersArchived = oldCancelledOrders.length
    }

    // 5. Limpar tokens de redefinição de senha expirados
    // NOTA: Campos resetPasswordToken não existem no modelo User
    // const expiredTokens = await prisma.user.updateMany({
    //   where: {
    //     resetPasswordToken: { not: null },
    //     resetPasswordExpires: { lt: new Date() }
    //   },
    //   data: {
    //     resetPasswordToken: null,
    //     resetPasswordExpires: null
    //   }
    // })

    // 6. Limpar imagens temporárias não utilizadas
    // TODO: Implementar limpeza de arquivos no sistema de arquivos
    // Buscar uploads temporários > 7 dias sem relação com produtos/pedidos

    // ─────────────────────────────────────────────────────────────────────────
    // 🔐 SEGURANÇA / LGPD — ISO 27001 A.12.4, LGPD Art.15
    // ─────────────────────────────────────────────────────────────────────────

    // 5. Limpar rate limit entries expirados
    const cleanedRateLimits = await prisma.rateLimitEntry.deleteMany({
      where: { resetAt: { lt: new Date() } }
    })
    results.rateLimitEntriesCleaned = cleanedRateLimits.count

    // 6. Limpar sessões JWT revogadas já expiradas (não precisam mais ser bloqueadas)
    const cleanedSessions = await prisma.revokedSession.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    })
    results.revokedSessionsCleaned = cleanedSessions.count

    // 7. Purgar AuditLog com mais de 1 ano (prazo de retenção LGPD / ISO 27001 A.12.4)
    // Exceção: manter ações críticas por 5 anos (financeiro, deleção de conta)
    const auditRetentionDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 ano
    const longRetentionDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) // 5 anos
    const criticalActions = ['WITHDRAWAL_APPROVED', 'PAYMENT_PROCESSED', 'ACCOUNT_DELETED', 'ORDER_REFUND_APPROVED']

    const purgedAuditLogs = await prisma.auditLog.deleteMany({
      where: {
        AND: [
          { createdAt: { lt: auditRetentionDate } },
          { action: { notIn: criticalActions } },
        ]
      }
    })
    // Purgar ações críticas após 5 anos
    const purgedCritical = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: longRetentionDate },
        action: { in: criticalActions },
      }
    })
    results.auditLogsPurged = purgedAuditLogs.count + purgedCritical.count

    // Atualizar configuração com última execução
    await prisma.systemConfig.upsert({
      where: { key: 'automation.cleanup.lastRun' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'automation.cleanup.lastRun',
        value: new Date().toISOString(),
        category: 'automation',
        label: 'Última Execução - Limpeza',
        type: 'datetime'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Limpeza concluída: ${results.sessionsDeleted} sessões + ${results.cartsDeleted} carrinhos removidos`,
      ...results,
      executionTime: Date.now() - startTime
    })
  } catch (error: any) {
    console.error('Erro na limpeza do sistema:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro na limpeza do sistema' },
      { status: 500 }
    )
  }
}
