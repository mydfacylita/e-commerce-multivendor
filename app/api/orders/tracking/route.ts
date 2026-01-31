import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * API para buscar histórico de rastreamento detalhado do AliExpress
 * Usa: aliexpress.ds.order.tracking.get (método correto para todos os tipos de logística)
 */


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface TrackingEvent {
  eventTime: string
  eventDescription: string
  eventLocation?: string
  status: string
}

interface TrackingInfo {
  trackingNumber: string
  carrier: string
  estimatedDelivery?: string
  currentStatus: string
  events: TrackingEvent[]
}

// Gerar assinatura
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, trackingNumber } = body

    if (!orderId && !trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'orderId ou trackingNumber é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar credenciais AliExpress
    const auth = await prisma.aliExpressAuth.findFirst({
      where: { accessToken: { not: null } }
    })

    if (!auth?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Credenciais AliExpress não configuradas' },
        { status: 400 }
      )
    }

    // Se temos orderId, buscar primeiro o tracking number do pedido
    let trackingCode = trackingNumber
    let logisticsServiceName = ''
    
    if (orderId && !trackingNumber) {
      // Buscar dados do pedido via API
      const orderParams: Record<string, string> = {
        app_key: auth.appKey,
        method: 'aliexpress.trade.ds.order.get',
        session: auth.accessToken,
        timestamp: Date.now().toString(),
        format: 'json',
        v: '2.0',
        sign_method: 'sha256',
        single_order_query: JSON.stringify({ order_id: orderId })
      }
      
      orderParams.sign = generateSign(orderParams, auth.appSecret)
      
      const orderUrl = `https://api-sg.aliexpress.com/sync?${new URLSearchParams(orderParams).toString()}`
      const orderRes = await fetch(orderUrl)
      const orderData = await orderRes.json()
      
      console.log('[Tracking] Order data:', JSON.stringify(orderData, null, 2))
      
      const orderResult = orderData.aliexpress_trade_ds_order_get_response?.result
      
      console.log('[Tracking] Full order result:', JSON.stringify(orderResult, null, 2))
      
      // Tentar buscar logistics_no de diferentes estruturas
      // 1. aeop_order_logistics_info (formato real da API)
      if (orderResult?.logistics_info_list?.aeop_order_logistics_info) {
        const logistics = orderResult.logistics_info_list.aeop_order_logistics_info
        const logisticsList = Array.isArray(logistics) ? logistics : [logistics]
        
        if (logisticsList.length > 0) {
          trackingCode = logisticsList[0].logistics_no
          logisticsServiceName = logisticsList[0].logistics_service || ''
        }
      }
      
      // 2. order_logistics (formato antigo)
      if (!trackingCode && orderResult?.logistics_info_list?.order_logistics) {
        const logistics = orderResult.logistics_info_list.order_logistics
        const logisticsList = Array.isArray(logistics) ? logistics : [logistics]
        
        if (logisticsList.length > 0) {
          trackingCode = logisticsList[0].logistics_no
          logisticsServiceName = logisticsList[0].logistics_service || ''
        }
      }
      
      // 3. Campo direto
      if (!trackingCode && orderResult?.tracking_number) {
        trackingCode = orderResult.tracking_number
      }
    }

    if (!trackingCode) {
      return NextResponse.json({
        success: true,
        hasTracking: false,
        message: 'Pedido ainda não possui código de rastreamento',
        tracking: null
      })
    }

    // Usar o método correto: aliexpress.ds.order.tracking.get
    // Este método funciona para todos os tipos de logística (incluindo lojas locais BR)
    const trackingParams: Record<string, string> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.order.tracking.get',
      session: auth.accessToken,
      timestamp: Date.now().toString(),
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      ae_order_id: orderId || '',
      language: 'pt_BR'
    }

    trackingParams.sign = generateSign(trackingParams, auth.appSecret)

    console.log('[Tracking] Buscando tracking para pedido:', orderId)

    const trackingUrl = `https://api-sg.aliexpress.com/sync?${new URLSearchParams(trackingParams).toString()}`
    const trackingRes = await fetch(trackingUrl)
    const trackingData = await trackingRes.json()

    console.log('[Tracking] Response:', JSON.stringify(trackingData, null, 2))

    // Processar resposta do novo método
    if (trackingData.error_response) {
      console.log('[Tracking] Erro na API de tracking:', trackingData.error_response)
      
      // Retornar dados básicos com mensagem de erro para debug
      return NextResponse.json({
        success: true,
        hasTracking: true,
        tracking: {
          trackingNumber: trackingCode,
          carrier: logisticsServiceName || 'AliExpress Standard',
          currentStatus: 'Em Trânsito',
          events: []
        },
        apiError: trackingData.error_response,
        debug: { orderId, trackingCode, logisticsServiceName }
      })
    }

    const result = trackingData.aliexpress_ds_order_tracking_get_response?.result

    if (!result?.ret || !result?.data) {
      console.log('[Tracking] Sem dados na resposta')
      return NextResponse.json({
        success: true,
        hasTracking: true,
        tracking: {
          trackingNumber: trackingCode,
          carrier: logisticsServiceName || 'AliExpress',
          currentStatus: 'Em Trânsito',
          events: []
        }
      })
    }

    // Mapear eventos de tracking do novo formato
    const events: TrackingEvent[] = []
    const trackingDetails = result.data.tracking_detail_line_list?.tracking_detail
    
    if (trackingDetails) {
      const detailList = Array.isArray(trackingDetails) ? trackingDetails : [trackingDetails]
      
      for (const detail of detailList) {
        const nodes = detail.detail_node_list?.detail_node
        if (nodes) {
          const nodeList = Array.isArray(nodes) ? nodes : [nodes]
          for (const node of nodeList) {
            const timestamp = node.time_stamp
            const eventTime = timestamp ? new Date(timestamp).toISOString() : ''
            
            events.push({
              eventTime,
              eventDescription: node.tracking_detail_desc || node.tracking_name || '',
              eventLocation: '',
              status: node.tracking_name || 'info'
            })
          }
        }
        
        // Pegar carrier e tracking number do detalhe
        if (!logisticsServiceName && detail.carrier_name) {
          logisticsServiceName = detail.carrier_name.trim()
        }
        if (!trackingCode && detail.mail_no) {
          trackingCode = detail.mail_no
        }
      }
    }

    // Ordenar eventos do mais recente para o mais antigo
    events.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime())

    // Calcular data estimada de entrega
    let estimatedDelivery: string | undefined
    if (trackingDetails) {
      const firstDetail = Array.isArray(trackingDetails) ? trackingDetails[0] : trackingDetails
      if (firstDetail?.eta_time_stamps) {
        estimatedDelivery = new Date(firstDetail.eta_time_stamps).toLocaleDateString('pt-BR')
      }
    }

    const trackingInfo: TrackingInfo = {
      trackingNumber: trackingCode,
      carrier: logisticsServiceName || 'AliExpress',
      estimatedDelivery,
      currentStatus: events[0]?.eventDescription || 'Em Trânsito',
      events
    }

    return NextResponse.json({
      success: true,
      hasTracking: true,
      tracking: trackingInfo
    })

  } catch (error: any) {
    console.error('[Tracking] Erro:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
