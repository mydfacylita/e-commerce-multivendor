import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SHOPEE_API_BASE = 'https://partner.shopeemobile.com'

function shopeeSign(partnerId: number, path: string, timestamp: number, accessToken: string, shopId: number, partnerKey: string) {
  return crypto.createHmac('sha256', partnerKey).update(`${partnerId}${path}${timestamp}${accessToken}${shopId}`).digest('hex')
}

async function getShopeeToken(auth: any, userId: string): Promise<string> {
  if (!auth.expiresAt || new Date(auth.expiresAt) > new Date(Date.now() + 60_000)) return auth.accessToken
  const endpoint = '/api/v2/auth/access_token/get'
  const timestamp = Math.floor(Date.now() / 1000)
  const sign = crypto.createHmac('sha256', auth.partnerKey).update(`${auth.partnerId}${endpoint}${timestamp}`).digest('hex')
  const body = JSON.stringify({ shop_id: auth.shopId, refresh_token: auth.refreshToken, partner_id: auth.partnerId })
  const res = await fetch(`${SHOPEE_API_BASE}${endpoint}?partner_id=${auth.partnerId}&timestamp=${timestamp}&sign=${sign}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  const data = await res.json()
  if (data.access_token) {
    await prisma.shopeeAuth.update({ where: { userId }, data: { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expire_in * 1000) } })
    return data.access_token
  }
  return auth.accessToken
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { marketplace, price } = await request.json()

    if (!marketplace || price === undefined || price === null) {
      return NextResponse.json({ message: 'marketplace e price são obrigatórios' }, { status: 400 })
    }

    const newPrice = parseFloat(price)
    if (isNaN(newPrice) || newPrice <= 0) {
      return NextResponse.json({ message: 'Preço inválido' }, { status: 400 })
    }

    const listing = await prisma.marketplaceListing.findUnique({
      where: { productId_marketplace: { productId: params.id, marketplace } },
    })

    if (!listing) {
      return NextResponse.json({ message: 'Anúncio não encontrado' }, { status: 404 })
    }

    // Push price update to marketplace API
    if (marketplace === 'mercadolivre') {
      const mlAuth = await prisma.mercadoLivreAuth.findFirst({ orderBy: { createdAt: 'desc' } })
      if (!mlAuth) {
        return NextResponse.json({ message: 'Conta do Mercado Livre não conectada' }, { status: 400 })
      }

      let accessToken = mlAuth.accessToken
      const now = new Date()

      if (mlAuth.expiresAt && now >= mlAuth.expiresAt) {
        const credentials = await (prisma as any).mercadoLivreCredentials.findFirst()
        if (!credentials || !mlAuth.refreshToken) {
          return NextResponse.json({ message: 'Token expirado. Reconecte sua conta do Mercado Livre' }, { status: 400 })
        }
        const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            refresh_token: mlAuth.refreshToken,
          }),
        })
        if (!refreshResponse.ok) {
          return NextResponse.json({ message: 'Erro ao renovar token do Mercado Livre' }, { status: 400 })
        }
        const refreshData = await refreshResponse.json()
        const newExpiresAt = new Date()
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in)
        await prisma.mercadoLivreAuth.update({
          where: { id: mlAuth.id },
          data: { accessToken: refreshData.access_token, refreshToken: refreshData.refresh_token, expiresAt: newExpiresAt },
        })
        accessToken = refreshData.access_token
      }

      const finalPrice = Number(newPrice.toFixed(2))
      const response = await fetch(`https://api.mercadolibre.com/items/${listing.listingId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: finalPrice }),
      })
      const mlData = await response.json()
      if (!response.ok) {
        console.error('[update-listing-price][ML] Erro:', mlData)
        return NextResponse.json({ message: mlData.message || 'Erro ao atualizar preço no Mercado Livre' }, { status: 400 })
      }
    }

    if (marketplace === 'shopee') {
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, include: { shopeeAuth: true } })
      if (!adminUser?.shopeeAuth) {
        return NextResponse.json({ message: 'Shopee não configurada' }, { status: 400 })
      }
      const auth = adminUser.shopeeAuth
      const accessToken = await getShopeeToken(auth, adminUser.id)
      const itemId = parseInt(listing.listingId)
      const endpoint = '/api/v2/product/update_price'
      const timestamp = Math.floor(Date.now() / 1000)
      const sign = shopeeSign(auth.partnerId, endpoint, timestamp, accessToken, auth.shopId, auth.partnerKey)
      const url = `${SHOPEE_API_BASE}${endpoint}?partner_id=${auth.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${auth.shopId}`
      const body = JSON.stringify({
        item_id: itemId,
        price_list: [{ model_id: 0, original_price: Number(newPrice.toFixed(2)) }],
      })
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      const data = await res.json()
      if (data.error && data.error !== '') {
        console.error('[update-listing-price][Shopee] Erro:', data)
        return NextResponse.json({ message: data.message || data.error || 'Erro ao atualizar preço na Shopee' }, { status: 400 })
      }
    }

    // Save new price in DB
    const updated = await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { price: newPrice, lastSyncAt: new Date() },
    })

    return NextResponse.json({ message: 'Preço atualizado com sucesso', price: updated.price })
  } catch (error) {
    console.error('[update-listing-price] Erro:', error)
    return NextResponse.json({ message: 'Erro ao atualizar preço', error: String(error) }, { status: 500 })
  }
}
