import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SHOPEE_API_BASE = 'https://partner.shopeemobile.com'

function shopeeSign(partnerId: number, path: string, timestamp: number, accessToken: string, shopId: number, partnerKey: string) {
  return crypto.createHmac('sha256', partnerKey)
    .update(`${partnerId}${path}${timestamp}${accessToken}${shopId}`)
    .digest('hex')
}

async function refreshIfNeeded(auth: any, userId: string): Promise<string> {
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

// GET /api/admin/marketplaces/shopee/attributes?categoryId=100419
// Returns attributes for a given Shopee category
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    if (!categoryId) return NextResponse.json({ error: 'categoryId obrigatório' }, { status: 400 })

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, include: { shopeeAuth: true } })
    if (!adminUser?.shopeeAuth?.accessToken) return NextResponse.json({ error: 'Shopee não configurada' }, { status: 400 })

    const auth = adminUser.shopeeAuth
    const accessToken = await refreshIfNeeded(auth, adminUser.id)

    const endpoint = '/api/v2/product/get_attributes'
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = shopeeSign(auth.partnerId, endpoint, timestamp, accessToken, auth.shopId, auth.partnerKey)

    const res = await fetch(
      `${SHOPEE_API_BASE}${endpoint}?partner_id=${auth.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${auth.shopId}&category_id=${categoryId}`,
      { method: 'GET' }
    )
    const data = await res.json()

    if (data.error && data.error !== '') {
      return NextResponse.json({ error: data.message || data.error }, { status: 400 })
    }

    const attrList: any[] = data?.response?.attributes || data?.response?.attribute_list || []

    // Return structured attributes for the form
    // is_mandatory can be boolean true OR number 1 depending on API version
    const attributes = attrList.map((attr: any) => ({
      id: attr.attribute_id,
      name: attr.display_attribute_name || attr.attribute_name || '',
      isMandatory: !!(attr.is_mandatory || attr.mandatory),
      inputType: attr.input_type || 'TEXT_FIELD',
      values: (attr.attribute_value_list || []).map((v: any) => ({
        id: v.value_id,
        name: v.display_value_name || v.value_name || String(v.value_id),
      })),
    }))

    return NextResponse.json({ attributes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
