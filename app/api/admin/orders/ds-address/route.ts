import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Buscar endereços válidos para envio no AliExpress DS
 * Usa aliexpress.ds.address.get
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { countryCode, cityName } = await req.json()

    // Buscar credenciais
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      return NextResponse.json({ 
        message: 'AliExpress não configurado',
        addresses: [] 
      }, { status: 200 })
    }

    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Parâmetros diretos para aliexpress.ds.address.get
    const params: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.address.get',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      countryCode: countryCode || 'BR',
    }
    
    // Adicionar cityName apenas se não estiver vazio
    if (cityName) {
      params.cityName = cityName
    }

    // Gerar assinatura
    params.sign = generateSign(params, auth.appSecret)

    const url = `${apiUrl}?${new URLSearchParams(params).toString()}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await response.json()

    return NextResponse.json({ 
      success: !data.error_response,
      rawResponse: data,
      requestParams: { countryCode: countryCode || 'BR', cityName: cityName || '' }
    })

  } catch (error: any) {
    console.error('[DS Address] Erro:', error)
    return NextResponse.json({ 
      message: error.message || 'Erro ao buscar endereços',
      addresses: [] 
    }, { status: 200 })
  }
}

/**
 * Gerar assinatura HMAC-SHA256 para API AliExpress
 */
function generateSign(params: Record<string, any>, appSecret: string): string {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort()
  
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  
  const signature = crypto.createHmac('sha256', appSecret)
    .update(signString)
    .digest('hex')
    .toUpperCase()
  
  return signature
}
