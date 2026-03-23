import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SHOPEE_API_BASE_URL = 'https://partner.shopeemobile.com'
const SELLER_FRONTEND = process.env.NEXTAUTH_URL || 'https://mydshop.com.br'

/**
 * GET /api/shopee/seller-callback
 *
 * Rota PÚBLICA (sem auth) — recebe o redirect da Shopee para o vendedor.
 * A Shopee redireciona para cá com ?code=X&shop_id=Y&state=seller_<userId>
 * Processa tudo server-side e faz redirect 302 para o painel do vendedor.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code    = searchParams.get('code')
  const shopId  = searchParams.get('shop_id')
  const state   = searchParams.get('state') || ''
  const error   = searchParams.get('error')

  const errorRedirect = (msg: string) =>
    NextResponse.redirect(`${SELLER_FRONTEND}/vendedor/integracao/shopee?error=${encodeURIComponent(msg)}`)

  if (error) return errorRedirect(error)
  if (!code || !shopId) return errorRedirect('Código ou Shop ID ausente')
  if (!state.startsWith('seller_')) return errorRedirect('state inválido')

  const userId = state.replace(/^seller_/, '')

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return errorRedirect('Vendedor não encontrado')

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { shopeeAuth: true },
    })

    if (!adminUser?.shopeeAuth?.partnerId || !adminUser?.shopeeAuth?.partnerKey) {
      return errorRedirect('Shopee não configurada pelo administrador')
    }

    const { partnerId, partnerKey } = adminUser.shopeeAuth
    const numericShopId = parseInt(shopId)

    // Trocar code por access token
    const timestamp = Math.floor(Date.now() / 1000)
    const endpoint  = '/api/v2/auth/token/get'
    const sign = crypto
      .createHmac('sha256', partnerKey)
      .update(`${partnerId}${endpoint}${timestamp}`)
      .digest('hex')

    const tokenRes = await fetch(
      `${SHOPEE_API_BASE_URL}${endpoint}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, shop_id: numericShopId, partner_id: partnerId }),
      }
    )
    const tokenData = await tokenRes.json()

    if (tokenData.error || !tokenData.access_token) {
      return errorRedirect(tokenData.message || tokenData.error || 'Tokens não recebidos')
    }

    // Buscar info da loja
    const shopInfoTs   = Math.floor(Date.now() / 1000)
    const shopInfoPath = '/api/v2/shop/get_shop_info'
    const shopInfoSign = crypto
      .createHmac('sha256', partnerKey)
      .update(`${partnerId}${shopInfoPath}${shopInfoTs}${tokenData.access_token}${numericShopId}`)
      .digest('hex')

    const shopInfoRes = await fetch(
      `${SHOPEE_API_BASE_URL}${shopInfoPath}?partner_id=${partnerId}&timestamp=${shopInfoTs}&sign=${shopInfoSign}&access_token=${tokenData.access_token}&shop_id=${numericShopId}`
    )
    const shopInfo    = await shopInfoRes.json()
    const merchantName = shopInfo?.response?.shop_name || null
    const region       = shopInfo?.response?.region || 'BR'
    const expiresAt    = new Date(Date.now() + tokenData.expire_in * 1000)

    await prisma.shopeeAuth.upsert({
      where: { userId: user.id },
      update: {
        shopId: numericShopId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        merchantName,
        region,
      },
      create: {
        userId: user.id,
        partnerId:   adminUser.shopeeAuth.partnerId,
        partnerKey:  adminUser.shopeeAuth.partnerKey,
        isSandbox:   adminUser.shopeeAuth.isSandbox ?? false,
        shopId: numericShopId,
        accessToken:  tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        merchantName,
        region,
      },
    })

    // Redireciona o vendedor de volta para o painel dele com sucesso
    return NextResponse.redirect(`${SELLER_FRONTEND}/vendedor/integracao/shopee?connected=1`)
  } catch (err) {
    console.error('Erro no seller-callback Shopee:', err)
    return errorRedirect('Erro interno ao processar autorização')
  }
}
