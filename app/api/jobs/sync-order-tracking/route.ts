import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAffiliateCommission } from '@/lib/affiliate-commission'
import { correiosCWS } from '@/lib/correios-cws'

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
          console.log(`📦 [TRACKING] Pedido ${order.id} marcado como DELIVERED (${order.trackingCode})`)

          // Processar comissão de afiliado automaticamente
          try {
            await processAffiliateCommission(order.id)
          } catch (affiliateError) {
            console.error(`⚠️  [TRACKING] Erro ao processar comissão do pedido ${order.id}:`, affiliateError)
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
