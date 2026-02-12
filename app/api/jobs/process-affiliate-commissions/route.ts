import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAffiliateCommission } from '@/lib/affiliate-commission'

/**
 * Job para processar comissões de afiliados pendentes
 * Busca todos os pedidos DELIVERED que têm afiliado mas comissão ainda PENDING
 * Pode ser executado manualmente ou via cron job
 * 
 * GET /api/jobs/process-affiliate-commissions
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

    // Verificar autorização (para cron jobs seguros)
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    console.log('🔄 [JOB] Iniciando processamento de comissões pendentes...')

    // Buscar pedidos DELIVERED que têm afiliado
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        affiliateId: {
          not: null
        }
      },
      select: {
        id: true,
        affiliateCode: true,
        total: true,
        createdAt: true
      }
    })

    console.log(`   📦 Encontrados ${deliveredOrders.length} pedidos entregues com afiliado`)

    if (deliveredOrders.length === 0) {
      return NextResponse.json({
        message: 'Nenhum pedido para processar',
        processed: 0,
        errors: 0
      })
    }

    const results: any[] = []
    let successCount = 0
    let errorCount = 0
    let alreadyProcessed = 0

    // Processar cada pedido
    for (const order of deliveredOrders) {
      try {
        const result = await processAffiliateCommission(order.id)
        
        if (result.success) {
          if (result.message === 'Comissão já liberada') {
            alreadyProcessed++
          } else if (result.message === 'Comissão liberada e creditada') {
            successCount++
            console.log(`   ✅ ${order.id}: R$ ${result.amount?.toFixed(2)} creditados para ${result.affiliate}`)
          }
        } else {
          errorCount++
          console.log(`   ⚠️ ${order.id}: ${result.message}`)
        }

        results.push({
          orderId: order.id,
          success: result.success,
          message: result.message,
          amount: result.amount
        })
      } catch (error: any) {
        errorCount++
        console.error(`   ❌ Erro ao processar ${order.id}:`, error?.message)
        results.push({
          orderId: order.id,
          success: false,
          message: error?.message || 'Erro desconhecido'
        })
      }
    }

    const summary = {
      message: 'Processamento concluído',
      total: deliveredOrders.length,
      processed: successCount,
      alreadyProcessed,
      errors: errorCount,
      results
    }

    console.log('📊 [JOB] Resumo:', {
      total: summary.total,
      processed: summary.processed,
      alreadyProcessed: summary.alreadyProcessed,
      errors: summary.errors
    })

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('❌ [JOB] Erro fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar job' },
      { status: 500 }
    )
  }
}

/**
 * POST para processar comissões de pedidos específicos
 * Body: { orderIds: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { orderIds } = body

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds é obrigatório e deve ser um array' },
        { status: 400 }
      )
    }

    console.log(`🔄 [JOB] Processando ${orderIds.length} pedidos específicos...`)

    const results: any[] = []
    let successCount = 0
    let errorCount = 0

    for (const orderId of orderIds) {
      try {
        const result = await processAffiliateCommission(orderId)
        
        if (result.success && result.message === 'Comissão liberada e creditada') {
          successCount++
        } else if (!result.success) {
          errorCount++
        }

        results.push({
          orderId,
          ...result
        })
      } catch (error: any) {
        errorCount++
        results.push({
          orderId,
          success: false,
          message: error?.message || 'Erro desconhecido'
        })
      }
    }

    return NextResponse.json({
      message: 'Processamento concluído',
      total: orderIds.length,
      processed: successCount,
      errors: errorCount,
      results
    })
  } catch (error: any) {
    console.error('❌ [JOB] Erro fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar job' },
      { status: 500 }
    )
  }
}
