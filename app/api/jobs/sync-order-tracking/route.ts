import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAffiliateCommission } from '@/lib/affiliate-commission'

/**
 * Job: Sincronização Automática de Rastreamento
 * 
 * Objetivo: Buscar atualizações de rastreamento dos Correios para pedidos em trânsito
 * 
 * Lógica:
 * 1. Busca pedidos com status IN_TRANSIT que possuem código de rastreamento
 * 2. Consulta API dos Correios para cada código
 * 3. Atualiza tracking_status e tracking_updated_at
 * 4. Se pedido foi entregue, atualiza status para DELIVERED
 */
export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now()

    // Buscar pedidos enviados com código de rastreamento
    const orders = await prisma.order.findMany({
      where: {
        status: 'SHIPPED',
        trackingCode: {
          not: null
        }
      },
      select: {
        id: true,
        trackingCode: true,
        updatedAt: true
      },
      take: 50 // Limitar a 50 por execução para não sobrecarregar API dos Correios
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
        // TODO: Integrar com API real dos Correios
        // Por enquanto, simulação de atualização
        const trackingInfo = await fetchCorreiosTracking(order.trackingCode!)

        if (trackingInfo.updated) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              updatedAt: new Date(),
              ...(trackingInfo.delivered && {
                status: 'DELIVERED',
                deliveredAt: new Date()
              })
            }
          })

          updated++
          if (trackingInfo.delivered) {
            delivered++
            
            // Processar comissão de afiliado
            try {
              const affiliateResult = await processAffiliateCommission(order.id)
              console.log('💰 [TRACKING SYNC] Comissão processada:', affiliateResult)
            } catch (affiliateError) {
              console.error('⚠️  [TRACKING SYNC] Erro ao processar comissão:', affiliateError)
            }
          }
        }
      } catch (error: any) {
        errors.push(`Order ${order.id}: ${error.message}`)
      }
    }

    // Atualizar configuração com última execução
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
      message: `Rastreamento atualizado: ${updated} de ${orders.length} pedidos`,
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
 * Função auxiliar para buscar informações de rastreamento dos Correios
 * TODO: Implementar integração real com API dos Correios
 */
async function fetchCorreiosTracking(trackingCode: string) {
  // Simulação - substituir por chamada real à API dos Correios
  // Exemplo: https://proxyapp.correios.com.br/v1/sro-rastro/{trackingCode}
  
  // Por enquanto, retorna aleatoriamente se houve atualização
  const random = Math.random()
  
  return {
    updated: random > 0.3, // 70% de chance de ter atualização
    delivered: random > 0.8, // 20% de chance de estar entregue
    status: random > 0.8 ? 'Objeto entregue ao destinatário' : 'Objeto em trânsito - por favor aguarde'
  }
}
