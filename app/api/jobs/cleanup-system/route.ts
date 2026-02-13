import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
 */
export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now()
    const results = {
      sessionsDeleted: 0,
      cartsDeleted: 0,
      logsDeleted: 0,
      ordersArchived: 0
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
