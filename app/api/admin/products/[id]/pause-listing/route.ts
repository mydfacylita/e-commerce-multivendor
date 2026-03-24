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
    const { marketplace, action } = await request.json()

    if (!marketplace || !action) {
      return NextResponse.json(
        { message: 'Marketplace e action são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['pause', 'activate'].includes(action)) {
      return NextResponse.json(
        { message: 'Action deve ser "pause" ou "activate"' },
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
      }
    })

    if (!listing) {
      return NextResponse.json(
        { message: 'Anúncio não encontrado' },
        { status: 404 }
      )
    }

    // Pausa/ativa baseado no marketplace
    if (marketplace === 'mercadolivre') {
      const result = await toggleMercadoLivre(listing.listingId, action)
      
      if (!result.success) {
        return NextResponse.json(
          { message: result.message },
          { status: 400 }
        )
      }

      // Atualiza o status no banco
      await prisma.marketplaceListing.update({
        where: {
          productId_marketplace: {
            productId: params.id,
            marketplace
          }
        },
        data: {
          status: result.status
        }
      })

      return NextResponse.json({
        message: action === 'pause' ? 'Anúncio pausado com sucesso' : 'Anúncio ativado com sucesso',
        status: result.status
      })
    }

    if (marketplace === 'shopee') {
      const result = await toggleShopee(listing.listingId, action)
      if (!result.success) {
        return NextResponse.json({ message: result.message }, { status: 400 })
      }
      await prisma.marketplaceListing.update({
        where: { productId_marketplace: { productId: params.id, marketplace } },
        data: { status: result.status }
      })
      return NextResponse.json({ message: action === 'pause' ? 'Anúncio pausado com sucesso' : 'Anúncio ativado com sucesso', status: result.status })
    }

    return NextResponse.json(
      { message: 'Marketplace não suportado' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Toggle Listing] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao alterar status do anúncio' },
      { status: 500 }
    )
  }
}

async function toggleShopee(listingId: string, action: 'pause' | 'activate') {
  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, include: { shopeeAuth: true } })
    if (!adminUser?.shopeeAuth) return { success: false, message: 'Shopee não configurada', status: 'active' }
    const auth = adminUser.shopeeAuth
    const accessToken = await getShopeeToken(auth, adminUser.id)
    const itemId = parseInt(listingId)
    const endpoint = '/api/v2/product/unlist'
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = shopeeSign(auth.partnerId, endpoint, timestamp, accessToken, auth.shopId, auth.partnerKey)
    const body = JSON.stringify({ item_list: [{ item_id: itemId, unlist: action === 'pause' }] })
    const res = await fetch(
      `${SHOPEE_API_BASE}${endpoint}?partner_id=${auth.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${auth.shopId}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    )
    const data = await res.json()
    if (data.error && data.error !== '') return { success: false, message: data.message || data.error, status: 'active' }
    const failureList: any[] = data?.response?.failure_list || []
    const failed = failureList.find((f: any) => f.item_id === itemId)
    if (failed) return { success: false, message: failed.failed_reason || 'Falha ao alterar status', status: 'active' }
    return { success: true, status: action === 'pause' ? 'paused' : 'active' }
  } catch (e: any) {
    return { success: false, message: e.message, status: 'active' }
  }
}

async function toggleMercadoLivre(listingId: string, action: 'pause' | 'activate') {
  try {
    // Busca as credenciais do Mercado Livre
    const mlAuth = await prisma.mercadoLivreAuth.findFirst({
      where: {
        expiresAt: { gt: new Date() }
      }
    })

    if (!mlAuth) {
      return {
        success: false,
        message: 'Credenciais do Mercado Livre não encontradas ou expiradas. Reconecte sua conta.'
      }
    }

    const accessToken = mlAuth.accessToken
    const newStatus = action === 'pause' ? 'paused' : 'active'
    
    console.log(`[ML Toggle] ${action === 'pause' ? 'Pausando' : 'Ativando'} anúncio: ${listingId}`)
    console.log(`[ML Toggle] Novo status: ${newStatus}`)
    
    const response = await fetch(
      `https://api.mercadolibre.com/items/${listingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      }
    )

    const data = await response.json()
    
    console.log('[ML Toggle] Response status:', response.status)
    console.log('[ML Toggle] Response data:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error('[ML Toggle] ❌ Erro da API ML:', data)
      
      // Mensagem mais específica
      let errorMsg = `Erro ao ${action === 'pause' ? 'pausar' : 'ativar'} anúncio`
      if (data.message) errorMsg += `: ${data.message}`
      if (data.error) errorMsg += ` (${data.error})`
      if (data.cause && data.cause.length > 0) {
        errorMsg += ` - ${data.cause.map((c: any) => c.message).join(', ')}`
      }
      
      return {
        success: false,
        message: errorMsg
      }
    }

    console.log(`[ML Toggle] ✅ Anúncio ${action === 'pause' ? 'pausado' : 'ativado'} com sucesso`)

    return {
      success: true,
      status: data.status,
      message: `Anúncio ${action === 'pause' ? 'pausado' : 'ativado'} com sucesso`
    }
  } catch (error) {
    console.error('[ML Toggle] Erro:', error)
    return {
      success: false,
      message: 'Erro ao alterar status: ' + String(error)
    }
  }
}
