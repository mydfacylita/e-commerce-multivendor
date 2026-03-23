import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SHOPEE_API_BASE_URL = 'https://partner.shopeemobile.com'

/**
 * POST /api/admin/marketplaces/shopee/auth/seller-callback
 *
 * Chamado pelo callback do admin quando state=seller_<userId>.
 * Não exige sessão pois o callback veio da Shopee via redirecionamento do navegador
 * — o userId vem do parâmetro `state` gerado no authorize do vendedor.
 */
export async function POST(request: NextRequest) {
  try {
    const { code, shopId, state } = await request.json()

    if (!code || !shopId || !state) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Extrair userId do state (formato: seller_<userId>)
    const userId = state.replace(/^seller_/, '')
    if (!userId) {
      return NextResponse.json({ error: 'state inválido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    // Credenciais do app ficam no admin
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

    const requestBody = JSON.stringify({ code, shop_id: shopId, partner_id: partnerId })

    // Assinatura: partner_id + path + timestamp (SEM body)
    const sign = crypto
      .createHmac('sha256', partnerKey)
      .update(`${partnerId}${endpoint}${timestamp}`)
      .digest('hex')

    const tokenResponse = await fetch(
      `${url}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody }
    )

    const tokenData = await tokenResponse.json()

    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.json(
        { error: `Erro da Shopee: ${tokenData.message || tokenData.error || 'tokens não recebidos'}` },
        { status: 400 }
      )
    }

    // Buscar info da loja
    const shopInfoTs = Math.floor(Date.now() / 1000)
    const shopInfoPath = '/api/v2/shop/get_shop_info'
    const shopInfoSign = crypto
      .createHmac('sha256', partnerKey)
      .update(`${partnerId}${shopInfoPath}${shopInfoTs}${tokenData.access_token}${shopId}`)
      .digest('hex')

    const shopInfoRes = await fetch(
      `${SHOPEE_API_BASE_URL}${shopInfoPath}?partner_id=${partnerId}&timestamp=${shopInfoTs}&sign=${shopInfoSign}&access_token=${tokenData.access_token}&shop_id=${shopId}`,
      { method: 'GET' }
    )
    const shopInfo = await shopInfoRes.json()
    const merchantName = shopInfo?.response?.shop_name || null
    const region = shopInfo?.response?.region || 'BR'

    const expiresAt = new Date(Date.now() + tokenData.expire_in * 1000)

    await prisma.shopeeAuth.upsert({
      where: { userId: user.id },
      update: {
        shopId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        merchantName,
        region,
      },
      create: {
        userId: user.id,
        partnerId: adminUser.shopeeAuth.partnerId,
        partnerKey: adminUser.shopeeAuth.partnerKey,
        isSandbox: adminUser.shopeeAuth.isSandbox ?? false,
        shopId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        merchantName,
        region,
      },
    })

    return NextResponse.json({ success: true, shopId, merchantName })
  } catch (error) {
    console.error('Erro ao processar seller-callback Shopee:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
