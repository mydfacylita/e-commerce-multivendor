import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAffiliateCommission } from '@/lib/affiliate-commission'
import { correiosCWS } from '@/lib/correios-cws'
import { verifyCronOrAdmin } from '@/lib/cron-auth'

/**
 * Job: Sincronização Automática de Rastreamento
 *
 * O SISTEMA é responsável por monitorar e atualizar o status de entrega.
 * O galpão/filial não marca pedidos como DELIVERED — isso é feito aqui
 * com base nos eventos retornados pela API real dos Correios.
 *
 * Eventos que indicam entrega (status DELIVERED):
 *   BDE — Objeto entregue ao destinatário
 *   BDI — Objeto entregue na caixa postal
 *
 * Execução recomendada: a cada 2 horas via cron.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyCronOrAdmin(req)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const startTime = Date.now()

    // Buscar pedidos SHIPPED com código de rastreamento dos Correios
    const orders = await prisma.order.findMany({
      where: {
        status: 'SHIPPED',
        trackingCode: { not: null }
      },
      select: { id: true, trackingCode: true, updatedAt: true },
      take: 50
    })

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum pedido para atualizar',
        processed: 0,
        updated: 0,
        delivered: 0,
        executionTime: Date.now() - startTime
      })
    }

    let updated = 0
    let delivered = 0
    const errors: string[] = []

    for (const order of orders) {
      try {
        const result = await correiosCWS.rastrearObjeto(order.trackingCode!)

        if (!result.success || !result.eventos?.length) continue

        // Verificar se algum evento indica entrega ao destinatário
        const isDelivered = result.eventos.some((evento: any) => {
          const tipo = (evento.tipo || evento.codigo || '').toUpperCase()
          const descricao = (evento.descricao || evento.status || '').toUpperCase()
          return (
            tipo === 'BDE' ||
            tipo === 'BDI' ||
            descricao.includes('ENTREGUE AO DESTINATÁRIO') ||
            descricao.includes('ENTREGUE NA CAIXA POSTAL')
          )
        })

        // Último evento = status atual
        const ultimoEvento = result.eventos[0]
        const statusDescricao = ultimoEvento?.descricao || ultimoEvento?.status || ''

        await prisma.order.update({
          where: { id: order.id },
          data: {
            updatedAt: new Date(),
            ...(isDelivered && {
              status: 'DELIVERED',
              deliveredAt: new Date(),
              deliveredBy: 'sistema:correios-tracking',
              receiverName: ultimoEvento?.destinatario?.nome || null,
              deliveryNotes: statusDescricao || null
            })
          }
        })

        updated++

        if (isDelivered) {
          delivered++

          // Processar comissão de afiliado automaticamente
          try {
            await processAffiliateCommission(order.id)
          } catch (affiliateError) {
            console.error(`⚠️  [TRACKING] Erro ao processar comissão do pedido ${order.id}:`, affiliateError)
          }

          // Créditar cashback por produto ao comprador
          try {
            await processCashbackOnDelivery(order.id)
          } catch (cashbackError) {
            console.error(`⚠️  [TRACKING] Erro ao processar cashback do pedido ${order.id}:`, cashbackError)
          }
        }
      } catch (error: any) {
        errors.push(`Order ${order.id}: ${error.message}`)
      }
    }

    // Registrar última execução
    await prisma.systemConfig.upsert({
      where: { key: 'automation.orderTracking.lastRun' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'automation.orderTracking.lastRun',
        value: new Date().toISOString(),
        category: 'automation',
        label: 'Última Execução - Rastreamento',
        type: 'datetime'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Rastreamento atualizado: ${updated} de ${orders.length} pedidos (${delivered} entregues)`,
      processed: orders.length,
      updated,
      delivered,
      errors: errors.length > 0 ? errors : undefined,
      executionTime: Date.now() - startTime
    })
  } catch (error: any) {
    console.error('Erro ao sincronizar rastreamento:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao sincronizar rastreamento' },
      { status: 500 }
    )
  }
}

/**
 * Credita cashback por produto ao comprador quando o pedido é entregue.
 * Só credita se o produto tem cashbackRate > 0 e o pedido ainda não foi processado.
 */
async function processCashbackOnDelivery(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      cashbackProcessed: true,
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { id: true, cashbackRate: true, name: true } }
        }
      }
    }
  })

  if (!order || !order.userId || order.cashbackProcessed) return

  const userId = order.userId

  // Calcular total de cashback a creditar
  let totalCashback = 0
  const descriptions: string[] = []

  for (const item of order.items) {
    const rate = item.product?.cashbackRate ?? 0
    if (rate > 0) {
      const valor = (item.price * item.quantity * rate) / 100
      totalCashback += valor
      descriptions.push(`${item.product!.name} (${rate}%)`)
    }
  }

  if (totalCashback <= 0) {
    // Marca como processado mesmo sem cashback para não reprocessar
    await prisma.order.update({ where: { id: orderId }, data: { cashbackProcessed: true } })
    return
  }

  // Buscar ou criar CustomerCashback
  let cashback = await prisma.customerCashback.findUnique({ where: { userId } })
  if (!cashback) {
    cashback = await prisma.customerCashback.create({
      data: { userId, balance: 0, pendingBalance: 0, totalEarned: 0, totalUsed: 0 }
    })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (cashback.expirationDays || 90))

  await prisma.$transaction([
    prisma.customerCashback.update({
      where: { userId },
      data: {
        balance: { increment: totalCashback },
        totalEarned: { increment: totalCashback }
      }
    }),
    prisma.cashbackTransaction.create({
      data: {
        cashbackId: cashback.id,
        type: 'CREDIT',
        amount: totalCashback,
        balanceBefore: cashback.balance,
        balanceAfter: cashback.balance + totalCashback,
        description: `Cashback pedido #${orderId.slice(0, 8).toUpperCase()}: ${descriptions.join(', ')}`,
        orderId,
        status: 'AVAILABLE',
        expiresAt
      }
    }),
    prisma.order.update({ where: { id: orderId }, data: { cashbackProcessed: true } })
  ])
}
