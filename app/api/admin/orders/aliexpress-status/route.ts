import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Consultar status do pedido no AliExpress
 * API: aliexpress.ds.order.get
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { orderId, aliexpressOrderId } = await req.json()

    if (!aliexpressOrderId) {
      return NextResponse.json(
        { message: 'ID do pedido AliExpress não fornecido' },
        { status: 400 }
      )
    }

    // Buscar credenciais do AliExpress
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      return NextResponse.json(
        { message: 'Credenciais AliExpress não configuradas' },
        { status: 400 }
      )
    }

    const crypto = require('crypto')
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Parâmetros para consultar status do pedido
    // Método correto: aliexpress.trade.ds.order.get
    const params: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.trade.ds.order.get',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
    }
    
    // O parâmetro single_order_query é um objeto JSON serializado
    params.single_order_query = JSON.stringify({
      order_id: aliexpressOrderId
    })

    // Gerar assinatura
    const sortedKeys = Object.keys(params)
      .filter(key => key !== 'sign')
      .sort()
    const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
    const sign = crypto.createHmac('sha256', auth.appSecret)
      .update(signString)
      .digest('hex')
      .toUpperCase()
    
    params.sign = sign

    console.log('[AliExpress Status] Consultando pedido:', aliexpressOrderId)

    const url = `${apiUrl}?${new URLSearchParams(params).toString()}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('[AliExpress Status] Resposta:', JSON.stringify(data, null, 2))

    // Verificar resposta
    if (data.error_response) {
      return NextResponse.json(
        { 
          success: false,
          error: `${data.error_response.msg} (${data.error_response.code})` 
        },
        { status: 400 }
      )
    }

    if (data.aliexpress_trade_ds_order_get_response?.result) {
      const result = data.aliexpress_trade_ds_order_get_response.result
      
      return NextResponse.json({
        success: true,
        order: {
          order_id: result.order_id,
          order_status: result.order_status,
          logistics_status: result.logistics_status,
          tracking_number: result.tracking_number,
          payment_status: result.payment_status,
          payment_time: result.payment_time,
          create_time: result.create_time,
          total_amount: result.total_amount,
          logistics_service_name: result.logistics_service_name,
          // URL de pagamento (se ainda não pago)
          payment_url: result.payment_url || result.checkout_url,
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Resposta inválida da API AliExpress' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[AliExpress Status] Erro:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
