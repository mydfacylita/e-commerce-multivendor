import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SHOPEE_API_BASE_URL = 'https://partner.shopeemobile.com'

// POST - Processar callback e obter tokens
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { code, shopId } = await request.json()

    if (!code || !shopId) {
      return NextResponse.json({ error: 'Código ou Shop ID não fornecido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    })

    // Usar credenciais do ADMIN para trocar o code por tokens
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { shopeeAuth: true },
    })

    if (!adminUser?.shopeeAuth?.partnerId || !adminUser?.shopeeAuth?.partnerKey) {
      return NextResponse.json({ error: 'Shopee não configurada pelo administrador' }, { status: 400 })
    }

    const { partnerId, partnerKey } = adminUser.shopeeAuth

    // Trocar code por access token
    const timestamp = Math.floor(Date.now() / 1000)
    const endpoint = '/api/v2/auth/token/get'
    const url = `${SHOPEE_API_BASE_URL}${endpoint}`

    const requestBody = JSON.stringify({
      code,
      shop_id: shopId,
      partner_id: partnerId,
    })

    const baseString = `${partnerId}${endpoint}${timestamp}${requestBody}`
    const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex')

    const fullUrl = `${url}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    })

    const data = await response.json()

    if (data.error) {
      return NextResponse.json(
        { error: `Erro da Shopee: ${data.message || data.error}` },
        { status: 400 }
      )
    }

    if (!data.access_token || !data.refresh_token) {
      return NextResponse.json({ error: 'Tokens não recebidos da Shopee' }, { status: 400 })
    }

    // Buscar informações da loja
    const shopInfoEndpoint = '/api/v2/shop/get_shop_info'
    const shopInfoTimestamp = Math.floor(Date.now() / 1000)
    const shopInfoBody = JSON.stringify({
      partner_id: partnerId,
      shop_id: shopId,
      timestamp: shopInfoTimestamp,
      access_token: data.access_token,
    })

    const shopInfoBaseString = `${partnerId}${shopInfoEndpoint}${shopInfoTimestamp}${shopInfoBody}`
    const shopInfoSign = crypto.createHmac('sha256', partnerKey).update(shopInfoBaseString).digest('hex')

    const shopInfoResponse = await fetch(
      `${SHOPEE_API_BASE_URL}${shopInfoEndpoint}?partner_id=${partnerId}&timestamp=${shopInfoTimestamp}&sign=${shopInfoSign}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: shopInfoBody }
    )

    const shopInfo = await shopInfoResponse.json()
    const merchantName = shopInfo?.response?.shop_name || null
    const region = shopInfo?.response?.region || 'BR'

    const expiresAt = new Date(Date.now() + data.expire_in * 1000)

    await prisma.shopeeAuth.update({
      where: { userId: user.id },
      data: {
        shopId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        merchantName,
        region,
      },
    })

    return NextResponse.json({ success: true, shopId, merchantName, expiresAt })
  } catch (error) {
    console.error('Erro ao processar callback Shopee (seller):', error)
    return NextResponse.json({ error: 'Erro ao processar autorização' }, { status: 500 })
  }
}
