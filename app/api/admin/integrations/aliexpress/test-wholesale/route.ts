import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Testar API aliexpress.ds.product.wholesale.get
 * Esta API retorna apenas produtos que você adicionou à sua lista de dropshipping
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { productId } = await req.json()

    // Buscar credenciais
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      return NextResponse.json({
        error: 'Credenciais AliExpress não configuradas'
      }, { status: 400 })
    }

    const crypto = require('crypto')
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Parâmetros para wholesale.get
    const params: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.product.wholesale.get',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      product_id: productId,
      ship_to_country: 'BR', // OBRIGATÓRIO
    }

    // Gerar assinatura
    const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
    const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
    const signature = crypto.createHmac('sha256', auth.appSecret)
      .update(signString)
      .digest('hex')
      .toUpperCase()
    
    params.sign = signature

    const url = `${apiUrl}?${new URLSearchParams(params).toString()}`

    console.log('[Test Wholesale] Chamando API:', params.method)
    console.log('[Test Wholesale] Product ID:', productId)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await response.json()

    console.log('[Test Wholesale] Resposta:', JSON.stringify(data, null, 2))

    // Verificar se produto está na lista
    let inList = false
    let message = ''

    if (data.aliexpress_ds_product_wholesale_get_response?.result) {
      inList = true
      message = '✅ Produto está na sua lista de dropshipping!'
    } else if (data.error_response) {
      message = `❌ Erro: ${data.error_response.msg}`
    } else {
      message = '❌ Produto NÃO está na sua lista de dropshipping'
    }

    return NextResponse.json({
      success: true,
      inList,
      message,
      data,
    })

  } catch (error: any) {
    console.error('[Test Wholesale] Erro:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
