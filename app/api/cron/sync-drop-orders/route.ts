import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { processAffiliateCommission } from '@/lib/affiliate-commission'

/**
 * CRON/API: Sincronizar status de pedidos Dropshipping
 * 
 * Busca status de todos os pedidos com aliexpressOrderId (supplierOrderId) no AliExpress
 * Atualiza: status, tracking number, logistics info
 * 
 * Pode ser chamado via:
 * - CRON job: curl http://localhost:3000/api/cron/sync-drop-orders
 * - Polling da página DSers
 */


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface SyncResult {
  orderId: string
  orderNumber: string
  supplierOrderId: string
  previousStatus: string | null
  currentStatus: string
  trackingNumber: string | null
  logisticsStatus: string | null
  updated: boolean
  error?: string
}

// Gerar assinatura para API AliExpress
function generateSign(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort()
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  return crypto.createHmac('sha256', appSecret)
    .update(signString)
    .digest('hex')
    .toUpperCase()
}

// Verificar status de tracking (entrega) via API de tracking
async function fetchTrackingStatus(
  aliexpressOrderId: string,
  appKey: string,
  appSecret: string,
  accessToken: string
): Promise<{ isDelivered: boolean; trackingName?: string }> {
  const params: Record<string, string> = {
    app_key: appKey,
    method: 'aliexpress.ds.order.tracking.get',
    session: accessToken,
    timestamp: Date.now().toString(),
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    ae_order_id: aliexpressOrderId,
    language: 'en_US'
  }
  params.sign = generateSign(params, appSecret)

  const url = `https://api-sg.aliexpress.com/sync?${new URLSearchParams(params).toString()}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    
    const trackingData = data.aliexpress_ds_order_tracking_get_response?.result?.data
    const trackingDetails = trackingData?.tracking_detail_line_list?.tracking_detail
    
    if (Array.isArray(trackingDetails) && trackingDetails.length > 0) {
      const nodes = trackingDetails[0]?.detail_node_list?.detail_node
      if (Array.isArray(nodes) && nodes.length > 0) {
        // Pegar o status mais recente (primeiro da lista)
        const latestStatus = nodes[0]?.tracking_name?.toLowerCase() || ''
        const isDelivered = latestStatus.includes('delivered') || 
                           latestStatus.includes('entregue') ||
                           latestStatus.includes('received')
        return { isDelivered, trackingName: nodes[0]?.tracking_name }
      }
    }
    return { isDelivered: false }
  } catch (error) {
    console.log(`[SYNC] Erro ao verificar tracking ${aliexpressOrderId}:`, error)
    return { isDelivered: false }
  }
}

// Buscar status do pedido no AliExpress
async function fetchOrderStatus(
  aliexpressOrderId: string,
  appKey: string,
  appSecret: string,
  accessToken: string
): Promise<{
  success: boolean
  status?: string
  logisticsStatus?: string
  trackingNumber?: string
  paymentStatus?: string
  logisticsServiceName?: string
  endReason?: string
  error?: string
}> {
  const timestamp = Date.now().toString()
  
  const params: Record<string, string> = {
    app_key: appKey,
    method: 'aliexpress.trade.ds.order.get',  // Método correto!
    session: accessToken,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
  }
  
  // O parâmetro single_order_query é um objeto JSON serializado
  const singleOrderQuery = JSON.stringify({
    order_id: aliexpressOrderId
  })
  params.single_order_query = singleOrderQuery

  // Gerar assinatura HMAC-SHA256 (igual ao aliexpress-status)
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort()
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  const sign = crypto.createHmac('sha256', appSecret)
    .update(signString)
    .digest('hex')
    .toUpperCase()
  
  params.sign = sign

  const url = `https://api-sg.aliexpress.com/sync?${new URLSearchParams(params).toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await response.json()
    
    console.log(`[SYNC] Resposta AE para ${aliexpressOrderId}:`, JSON.stringify(data).slice(0, 500))

    if (data.error_response) {
      return { 
        success: false, 
        error: `${data.error_response.msg} (${data.error_response.code})` 
      }
    }

    // Resposta vem em aliexpress_trade_ds_order_get_response (não aliexpress_ds_order_get_response)
    const result = data.aliexpress_trade_ds_order_get_response?.result

    if (!result) {
      return { success: false, error: 'Resposta inválida da API' }
    }

    // Buscar tracking - aeop_order_logistics_info é o formato real da API
    let trackingNumber = result.tracking_number || null
    let logisticsService = result.logistics_service_name || null
    
    if (!trackingNumber && result.logistics_info_list?.aeop_order_logistics_info) {
      const logisticsList = Array.isArray(result.logistics_info_list.aeop_order_logistics_info) 
        ? result.logistics_info_list.aeop_order_logistics_info 
        : [result.logistics_info_list.aeop_order_logistics_info]
      if (logisticsList[0]) {
        trackingNumber = logisticsList[0].logistics_no || null
        logisticsService = logisticsList[0].logistics_service || logisticsService
      }
    }

    // Verificar se algum item foi cancelado (end_reason)
    let endReason: string | undefined = undefined
    const childOrderList = result.child_order_list?.aeop_child_order_info
    if (childOrderList) {
      const childOrders = Array.isArray(childOrderList) ? childOrderList : [childOrderList]
      for (const child of childOrders) {
        if (child.end_reason) {
          endReason = child.end_reason
          break
        }
      }
    }

    return {
      success: true,
      status: result.order_status,
      logisticsStatus: result.logistics_status,
      trackingNumber,
      paymentStatus: result.payment_status,
      logisticsServiceName: logisticsService,
      endReason // CANCELED, BUYER_CANCEL, etc
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Mapear status do AliExpress para status interno do sistema
function mapAliExpressToInternalStatus(aeStatus: string): string {
  const statusMap: Record<string, string> = {
    // Status de pagamento pendente
    'PLACE_ORDER_SUCCESS': 'PENDING',           // Pedido criado, aguardando pagamento
    
    // Status de processamento
    'WAIT_SELLER_SEND_GOODS': 'PROCESSING',     // Pago, aguardando envio do vendedor
    'FUND_PROCESSING': 'PROCESSING',            // Processando pagamento
    'WAIT_SELLER_EXAMINE_MONEY': 'PROCESSING',  // Aguardando confirmação de pagamento
    
    // Status de envio
    'SELLER_PART_SEND_GOODS': 'SHIPPED',        // Parcialmente enviado
    'WAIT_BUYER_ACCEPT_GOODS': 'SHIPPED',       // Em trânsito
    
    // Status finais de sucesso
    'FINISH': 'DELIVERED',                      // Entregue
    
    // Status de cancelamento - TODOS os possíveis!
    'IN_CANCEL': 'CANCELLED',                   // Em processo de cancelamento
    'CANCELLED': 'CANCELLED',                   // Cancelado
    'CANCEL': 'CANCELLED',                      // Cancelado (alternativo)
    'BUYER_CANCEL': 'CANCELLED',                // Cancelado pelo comprador
    'SELLER_CANCEL': 'CANCELLED',               // Cancelado pelo vendedor
    'CLOSE': 'CANCELLED',                       // Fechado
    'CLOSED': 'CANCELLED',                      // Fechado
    'PAY_TIMEOUT': 'CANCELLED',                 // Timeout de pagamento
    'PAY_FAILED': 'CANCELLED',                  // Falha no pagamento
    'REFUND_SUCCESS': 'CANCELLED',              // Reembolso concluído
    'IN_REFUND': 'CANCELLED',                   // Em reembolso
    'REFUNDING': 'CANCELLED',                   // Em reembolso
    
    // Status de espera/problema
    'RISK_CONTROL': 'ON_HOLD',                  // Controle de risco
    'IN_FROZEN': 'ON_HOLD',                     // Congelado
    'FROZEN': 'ON_HOLD',                        // Congelado
    'DISPUTE': 'ON_HOLD',                       // Em disputa
    'IN_ISSUE': 'ON_HOLD',                      // Com problema
  }
  
  // Log para debug - ver status não mapeados
  if (!statusMap[aeStatus]) {
    console.log(`[SYNC] ⚠️ Status não mapeado: "${aeStatus}" - usando PROCESSING`)
  }
  
  return statusMap[aeStatus] || 'PROCESSING'
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // 🔐 Verificar autorização CRON
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Em desenvolvimento sem secret, permitir
  const isDev = process.env.NODE_ENV === 'development'
  if (!isDev && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[SYNC-DROP-ORDERS] ⚠️ Tentativa de acesso não autorizada')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('\n[SYNC-DROP-ORDERS] 🔄 Iniciando sincronização...')
  console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`)

  try {
    // Buscar credenciais AliExpress
    const auth = await prisma.aliExpressAuth.findFirst({
      where: { accessToken: { not: null } }
    })

    if (!auth?.accessToken) {
      console.log('[SYNC-DROP-ORDERS] ❌ Nenhuma credencial AliExpress configurada')
      return NextResponse.json({
        success: false,
        error: 'Nenhuma credencial AliExpress configurada'
      }, { status: 400 })
    }

    // Buscar pedidos com supplierOrderId (foram enviados ao AliExpress)
    // e que ainda não estão DELIVERED ou CANCELLED
    const orders = await prisma.order.findMany({
      where: {
        supplierOrderId: { not: null },
        status: {
          notIn: ['DELIVERED', 'CANCELLED']
        }
      },
      select: {
        id: true,
        supplierOrderId: true,
        status: true,
        trackingCode: true,
        affiliateId: true,
        items: {
          select: {
            id: true,
            supplierOrderId: true,
            supplierStatus: true,
            trackingCode: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limitar para evitar rate limit
    })

    console.log(`[SYNC-DROP-ORDERS] 📦 ${orders.length} pedidos para sincronizar`)

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum pedido pendente para sincronizar',
        results: [],
        summary: { total: 0, updated: 0, errors: 0 }
      })
    }

    const results: SyncResult[] = []
    let updated = 0
    let errors = 0

    for (const order of orders) {
      // Rate limiting: 300ms entre requisições
      await new Promise(resolve => setTimeout(resolve, 300))

      const aliOrderId = order.supplierOrderId!
      
      console.log(`[SYNC-DROP-ORDERS] 📡 Consultando: ${aliOrderId}`)

      const statusResult = await fetchOrderStatus(
        aliOrderId,
        auth.appKey,
        auth.appSecret,
        auth.accessToken
      )

      const result: SyncResult = {
        orderId: order.id,
        orderNumber: order.id.slice(-6).toUpperCase(),
        supplierOrderId: aliOrderId,
        previousStatus: order.status,
        currentStatus: statusResult.status || order.status,
        trackingNumber: statusResult.trackingNumber || order.trackingCode,
        logisticsStatus: statusResult.logisticsStatus || null,
        updated: false
      }

      if (!statusResult.success) {
        result.error = statusResult.error
        errors++
        results.push(result)
        continue
      }

      // Verificar status de entrega via API de tracking
      // (a API de pedido pode mostrar WAIT_BUYER_ACCEPT_GOODS, mas o tracking já mostra Entregue)
      let isDeliveredByTracking = false
      let trackingStatusName = ''
      if (statusResult.status === 'WAIT_BUYER_ACCEPT_GOODS' && order.status === 'SHIPPED') {
        const trackingStatus = await fetchTrackingStatus(
          aliOrderId,
          auth.appKey,
          auth.appSecret,
          auth.accessToken
        )
        if (trackingStatus.isDelivered) {
          isDeliveredByTracking = true
          trackingStatusName = trackingStatus.trackingName || 'Delivered'
          console.log(`[SYNC-DROP-ORDERS] 📦 Tracking mostra ENTREGUE: ${trackingStatusName}`)
        }
        // Rate limiting extra
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Verificar se houve mudança
      const newInternalStatus = mapAliExpressToInternalStatus(statusResult.status || '')
      const hasStatusChange = statusResult.status && statusResult.status !== order.items[0]?.supplierStatus
      const hasTrackingChange = statusResult.trackingNumber && statusResult.trackingNumber !== order.trackingCode
      const hasEndReason = !!statusResult.endReason // Se tem end_reason é porque foi cancelado

      if (hasStatusChange || hasTrackingChange || hasEndReason || isDeliveredByTracking) {
        // Verificar se o pedido foi cancelado/deletado no AliExpress
        // Pode ser pelo status OU pelo end_reason dos itens
        const cancelledStatuses = [
          'IN_CANCEL', 'CANCELLED', 'CANCEL', 'BUYER_CANCEL', 'SELLER_CANCEL',
          'CLOSE', 'CLOSED', 'PAY_TIMEOUT', 'PAY_FAILED', 'REFUND_SUCCESS',
          'IN_REFUND', 'REFUNDING', 'FROZEN', 'DISPUTE', 'IN_ISSUE'
        ]
        
        const cancelledEndReasons = [
          'CANCELED', 'CANCELLED', 'BUYER_CANCEL', 'SELLER_CANCEL', 
          'NO_STOCK', 'OUT_OF_STOCK', 'REFUND', 'DISPUTE'
        ]
        
        const isCancelledByStatus = cancelledStatuses.includes(statusResult.status || '')
        const isCancelledByEndReason = cancelledEndReasons.includes(statusResult.endReason || '')
        const isCancelled = isCancelledByStatus || isCancelledByEndReason
        
        if (isCancelled) {
          // Pedido cancelado no AliExpress - limpar dados para permitir novo envio
          console.log(`[SYNC-DROP-ORDERS] 🔄 Pedido cancelado no AliExpress, liberando para novo envio...`)
          console.log(`   Status: ${statusResult.status}, EndReason: ${statusResult.endReason}`)
          
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'PROCESSING', // Volta para processando
              supplierOrderId: null, // Limpa o número do pedido AliExpress
              trackingCode: null, // Limpa o rastreio
              shippingCarrier: null, // Limpa a transportadora
              shippedAt: null // Limpa a data de envio
            }
          })

          // Limpar dados dos itens também
          for (const item of order.items) {
            await prisma.orderItem.update({
              where: { id: item.id },
              data: {
                supplierStatus: null, // Limpa o status do fornecedor
                supplierOrderId: null, // Limpa o ID do pedido no fornecedor
                trackingCode: null // Limpa o rastreio
              }
            })
          }

          result.updated = true
          result.currentStatus = 'PROCESSING (Liberado para novo envio)'
          result.trackingNumber = null
          updated++

          console.log(`[SYNC-DROP-ORDERS] ✅ Pedido ${order.id} liberado para novo envio`)
          console.log(`   Status AliExpress era: ${statusResult.status}`)
          console.log(`   Agora: PROCESSING (aguardando novo envio)`)
        } else {
          // Fluxo normal - atualizar com novos dados
          const updateData: any = {
            trackingCode: statusResult.trackingNumber || order.trackingCode,
          }

          // Só atualiza status interno se for uma mudança significativa
          if (hasStatusChange || isDeliveredByTracking) {
            updateData.status = isDeliveredByTracking ? 'DELIVERED' : newInternalStatus
          }

          // Atualizar transportadora se tiver
          if (statusResult.logisticsServiceName) {
            updateData.shippingCarrier = statusResult.logisticsServiceName
          }

          // Marcar shippedAt se mudou para status de envio e tem tracking
          if (statusResult.trackingNumber && !order.trackingCode && 
              ['SELLER_PART_SEND_GOODS', 'WAIT_BUYER_ACCEPT_GOODS'].includes(statusResult.status || '')) {
            updateData.shippedAt = new Date()
          }

          await prisma.order.update({
            where: { id: order.id },
            data: updateData
          })

          // Processar comissão de afiliado se foi marcado como entregue
          if (updateData.status === 'DELIVERED' && order.affiliateId) {
            try {
              const affiliateResult = await processAffiliateCommission(order.id)
              console.log(`[SYNC-DROP-ORDERS] 💰 Comissão processada:`, affiliateResult)
            } catch (affiliateError) {
              console.error(`[SYNC-DROP-ORDERS] ⚠️  Erro ao processar comissão:`, affiliateError)
            }
          }

          // Atualizar OrderItems - salvar o status real do AliExpress
          for (const item of order.items) {
            await prisma.orderItem.update({
              where: { id: item.id },
              data: {
                supplierStatus: isDeliveredByTracking ? 'DELIVERED' : statusResult.status, // Status real
                trackingCode: statusResult.trackingNumber || item.trackingCode
              }
            })
          }

          result.updated = true
          result.currentStatus = isDeliveredByTracking ? 'DELIVERED' : (statusResult.status || '')
          result.trackingNumber = statusResult.trackingNumber || null
          updated++

          console.log(`[SYNC-DROP-ORDERS] ✅ Atualizado: ${order.id}`)
          console.log(`   Status AE: ${statusResult.status}`)
          console.log(`   Status Interno: ${newInternalStatus}`)
          console.log(`   Tracking: ${statusResult.trackingNumber || 'N/A'}`)
        }
      } else {
        console.log(`[SYNC-DROP-ORDERS] ⏭️ Sem alterações: ${order.id}`)
      }

      results.push(result)
    }

    const duration = Date.now() - startTime

    console.log(`\n[SYNC-DROP-ORDERS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[SYNC-DROP-ORDERS] 📊 RESUMO:`)
    console.log(`[SYNC-DROP-ORDERS]    Total: ${orders.length}`)
    console.log(`[SYNC-DROP-ORDERS]    ✅ Atualizados: ${updated}`)
    console.log(`[SYNC-DROP-ORDERS]    🚫 Erros: ${errors}`)
    console.log(`[SYNC-DROP-ORDERS]    ⏱️ Tempo: ${(duration / 1000).toFixed(1)}s`)
    console.log(`[SYNC-DROP-ORDERS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    return NextResponse.json({
      success: true,
      summary: {
        total: orders.length,
        updated,
        errors,
        duration
      },
      results
    })

  } catch (error: any) {
    console.error('[SYNC-DROP-ORDERS] ❌ Erro:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST também funciona (para chamadas internas)
export async function POST(request: NextRequest) {
  return GET(request)
}
