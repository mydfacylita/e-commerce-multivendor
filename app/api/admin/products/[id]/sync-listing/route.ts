import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { marketplace } = await request.json()

    if (!marketplace) {
      return NextResponse.json(
        { message: 'Marketplace não especificado' },
        { status: 400 }
      )
    }

    // Busca a listagem
    const listing = await prisma.marketplaceListing.findUnique({
      where: {
        productId_marketplace: {
          productId: params.id,
          marketplace
        }
      },
      include: {
        product: true
      }
    })

    if (!listing) {
      return NextResponse.json(
        { message: 'Anúncio não encontrado' },
        { status: 404 }
      )
    }

    // Sincroniza baseado no marketplace
    if (marketplace === 'mercadolivre') {
      const result = await syncMercadoLivre(listing)
      
      if (!result.success) {
        return NextResponse.json(
          { message: result.message },
          { status: 400 }
        )
      }

      // Atualiza o registro
      await prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: {
          price: result.price,
          stock: result.stock,
          status: result.status,
          lastSyncAt: new Date(),
          errorMessage: null
        }
      })

      return NextResponse.json({
        message: 'Sincronização realizada com sucesso',
        data: result
      })
    }

    if (marketplace === 'shopee') {
      const result = await syncShopee(listing)
      if (!result.success) {
        return NextResponse.json({ message: result.message }, { status: 400 })
      }
      await prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: { price: result.price, stock: result.stock, status: result.status, lastSyncAt: new Date(), errorMessage: null }
      })
      return NextResponse.json({ message: 'Sincronização realizada com sucesso', data: result })
    }

    return NextResponse.json(
      { message: 'Marketplace não suportado' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Sync Listing] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao sincronizar', error: String(error) },
      { status: 500 }
    )
  }
}

async function syncShopee(listing: any) {
  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, include: { shopeeAuth: true } })
    if (!adminUser?.shopeeAuth) return { success: false, message: 'Shopee não configurada', price: 0, stock: 0, status: 'active' }
    const auth = adminUser.shopeeAuth
    const accessToken = await getShopeeToken(auth, adminUser.id)
    const itemId = parseInt(listing.listingId)
    const endpoint = '/api/v2/product/get_item_base_info'
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = shopeeSign(auth.partnerId, endpoint, timestamp, accessToken, auth.shopId, auth.partnerKey)
    const res = await fetch(
      `${SHOPEE_API_BASE}${endpoint}?partner_id=${auth.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${auth.shopId}&item_id_list=${itemId}&need_complaint_policy=false`,
      { method: 'GET' }
    )
    const data = await res.json()
    if (data.error && data.error !== '') return { success: false, message: data.message || data.error, price: 0, stock: 0, status: 'active' }
    const item = data?.response?.item_list?.[0]
    if (!item) return { success: false, message: 'Produto não encontrado na Shopee', price: 0, stock: 0, status: 'active' }
    const price = item.price_info?.[0]?.current_price ?? listing.price
    const stock = item.stock_info_v2?.summary_info?.total_available_stock ?? listing.stock
    const status = item.item_status === 'UNLIST' ? 'paused' : 'active'
    return { success: true, price, stock, status, message: 'Sincronizado' }
  } catch (e: any) {
    return { success: false, message: e.message, price: 0, stock: 0, status: 'active' }
  }
}

async function syncMercadoLivre(listing: any) {
  try {
    // Busca credenciais
    const mlAuth = await prisma.mercadoLivreAuth.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!mlAuth) {
      return {
        success: false,
        message: 'Conta do Mercado Livre não conectada'
      }
    }

    // Verifica se o token expirou e renova se necessário
    const now = new Date()
    let accessToken = mlAuth.accessToken

    if (mlAuth.expiresAt && now >= mlAuth.expiresAt) {
      console.log('[ML Sync] Token expirado, renovando...')
      
      const credentials = await (prisma as any).mercadoLivreCredentials.findFirst()
      
      if (!credentials || !mlAuth.refreshToken) {
        return {
          success: false,
          message: 'Token expirado. Por favor, reconecte sua conta do Mercado Livre'
        }
      }

      const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          refresh_token: mlAuth.refreshToken,
        }),
      })

      if (!refreshResponse.ok) {
        return {
          success: false,
          message: 'Erro ao renovar token. Por favor, reconecte sua conta'
        }
      }

      const refreshData = await refreshResponse.json()
      
      const newExpiresAt = new Date()
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in)

      await prisma.mercadoLivreAuth.update({
        where: { id: mlAuth.id },
        data: {
          accessToken: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
          expiresAt: newExpiresAt,
        }
      })

      accessToken = refreshData.access_token
      console.log('[ML Sync] Token renovado com sucesso')
    }

    // Prepara imagens (fotos podem ser atualizadas)
    let images: string[] = []
    try {
      images = Array.isArray(listing.product.images) 
        ? listing.product.images 
        : JSON.parse(listing.product.images)
    } catch (e) {
      console.error('[ML Sync] Erro ao parsear imagens:', e)
      images = []
    }

    const validImages = images.filter((url: string) => {
      if (!url || typeof url !== 'string') return false
      return url.startsWith('http://') || url.startsWith('https://')
    })

    const pictures = validImages.map((url: string) => ({ source: url }))

    // Atualiza preço, estoque e fotos no ML
    // Garante que o preço tenha exatamente 2 casas decimais (ML não aceita mais que isso para BRL)
    const finalPrice = Number(listing.product.price.toFixed(2))
    console.log('[ML Sync] Preço original:', listing.product.price, '→ Preço final:', finalPrice)
    console.log('[ML Sync] Atualizando com', pictures.length, 'fotos')
    
    // IMPORTANTE: O Mercado Livre NÃO permite atualizar descrição e atributos após publicação
    // Apenas preço, estoque e fotos podem ser atualizados
    const updateData: any = {
      price: finalPrice,
      available_quantity: listing.product.stock,
    }
    
    // Adiciona fotos se houver
    if (pictures.length > 0) {
      updateData.pictures = pictures
    }

    const response = await fetch(
      `https://api.mercadolibre.com/items/${listing.listingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[ML Sync] Erro da API:', data)
      return {
        success: false,
        message: data.message || 'Erro ao sincronizar com Mercado Livre'
      }
    }

    return {
      success: true,
      price: data.price,
      stock: data.available_quantity,
      status: data.status,
      message: 'Sincronizado com sucesso'
    }
  } catch (error) {
    console.error('[ML Sync] Erro:', error)
    return {
      success: false,
      message: 'Erro ao sincronizar: ' + String(error)
    }
  }
}
