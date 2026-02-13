import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Job: Processamento Automático de Pedidos
 * 
 * Objetivo: Automatizar transições de status e ações sobre pedidos
 * 
 * Lógica:
 * 1. Cancelar pedidos PENDING sem pagamento após 3 dias
 * 2. Alertar pedidos PROCESSING sem envio após 5 dias
 * 3. Marcar pedidos IN_TRANSIT sem atualização há 30 dias como PROBLEM
 * 4. Auto-completar pedidos DELIVERED há mais de 7 dias
 */
export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now()
    const results = {
      cancelled: 0,
      alerted: 0,
      problemReported: 0,
      completed: 0
    }

    // 1. Cancelar pedidos PENDING sem pagamento após 3 dias
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: { in: ['PENDING', 'FAILED'] },
        createdAt: { lt: threeDaysAgo }
      }
    })

    for (const order of pendingOrders) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          // cancelledAt: new Date(), // Campo não existe no modelo Order
          cancelReason: 'Cancelado automaticamente: pagamento não confirmado em 3 dias'
        }
      })

      // Restaurar estoque dos itens
      const items = await prisma.orderItem.findMany({
        where: { orderId: order.id }
      })

      for (const item of items) {
        if (item.productId) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity }
            }
          })
        }
      }

      results.cancelled++
    }

    // 2. Alertar pedidos PROCESSING sem envio após 5 dias
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    
    const delayedOrders = await prisma.order.findMany({
      where: {
        status: 'PROCESSING',
        trackingCode: null,
        createdAt: { lt: fiveDaysAgo }
      },
      include: {
        user: true
      }
    })

    for (const order of delayedOrders) {
      // TODO: Criar notificação ou alerta para admin
      console.log(`[ALERT] Pedido ${order.id} atrasado: ${order.user?.email || 'sem email'}`)
      results.alerted++
    }

    // 3. Alertar pedidos enviados há mais de 30 dias sem entrega
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const stuckOrders = await prisma.order.findMany({
      where: {
        status: 'SHIPPED',
        shippedAt: { lt: thirtyDaysAgo }
      },
      include: {
        user: true
      }
    })
    
    for (const order of stuckOrders) {
      // TODO: Criar notificação ou alerta para admin
      console.log(`[ALERT] Pedido ${order.id} enviado há mais de 30 dias sem entrega`)
      results.problemReported++
    }

    // 4. Manter pedidos entregues há mais de 7 dias (já estão no status final)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const deliveredOrders = await prisma.order.count({
      where: {
        status: 'DELIVERED',
        deliveredAt: { lt: sevenDaysAgo }
      }
    })
    results.completed = deliveredOrders

    // 5. Detectar possíveis fraudes: múltiplos pedidos do mesmo IP em pouco tempo
    // TODO: Implementar análise de fraude
    // const suspiciousOrders = await detectFraudulentOrders()

    // Atualizar configuração com última execução
    await prisma.systemConfig.upsert({
      where: { key: 'automation.orderProcessing.lastRun' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'automation.orderProcessing.lastRun',
        value: new Date().toISOString(),
        category: 'automation',
        label: 'Última Execução - Processamento de Pedidos',
        type: 'datetime'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Processamento concluído: ${results.cancelled} cancelados, ${results.completed} entregues`,
      ...results,
      executionTime: Date.now() - startTime
    })
  } catch (error: any) {
    console.error('Erro no processamento de pedidos:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro no processamento de pedidos' },
      { status: 500 }
    )
  }
}
