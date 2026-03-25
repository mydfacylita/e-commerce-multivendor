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

// Cache do Shopee: armazena a lista completa de categorias por 10 minutos
let categoryCache: { categories: any[]; timestamp: number } | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

async function getAllShopeeCategories(auth: any, accessToken: string, forceRefresh = false): Promise<any[]> {
  if (!forceRefresh && categoryCache && Date.now() - categoryCache.timestamp < CACHE_TTL) {
    return categoryCache.categories
  }

  const endpoint = '/api/v2/product/get_category'
  const timestamp = Math.floor(Date.now() / 1000)
  const sign = shopeeSign(auth.partnerId, endpoint, timestamp, accessToken, auth.shopId, auth.partnerKey)

  const res = await fetch(
    `${SHOPEE_API_BASE}${endpoint}?partner_id=${auth.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${auth.shopId}&language=pt-BR`,
    { method: 'GET' }
  )
  const data = await res.json()

  if (data.error && data.error !== '') {
    throw new Error(data.message || data.error)
  }

  const raw: any[] = data?.response?.category_list || []

  // Log warning para diagnóstico (não filtrar nada — os IDs no warning podem ser os corretos)
  const warningStr: string = data?.warning || ''
  if (warningStr) console.log('[Shopee categories] warning:', warningStr.substring(0, 500))
  console.log(`[Shopee categories] get_category retornou ${raw.length} categorias`)

  const categories = raw
    .map((c: any) => ({
      id: c.category_id as number,
      name: (c.display_category_name || c.category_name || '') as string,
      parentId: (c.parent_category_id || 0) as number,
      hasChildren: !!(c.has_children),
    }))

  categoryCache = { categories, timestamp: Date.now() }
  return categories
}

// GET /api/admin/marketplaces/shopee/categories
// Params:
//   ?parentId=0          → filhos diretos desse parent (0 = raiz)
//   ?query=xxx           → busca texto nas categorias folha (retorna com path completo)
//   (sem params)         → categorias raiz (parentId=0)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const parentIdParam = searchParams.get('parentId')
    const query = searchParams.get('query') || ''

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, include: { shopeeAuth: true } })
    if (!adminUser?.shopeeAuth?.accessToken) return NextResponse.json({ error: 'Shopee não configurada' }, { status: 400 })

    const auth = adminUser.shopeeAuth
    const accessToken = await refreshIfNeeded(auth, adminUser.id)

    // force=true na query string força refresh do cache
    const forceRefresh = searchParams.get('force') === 'true'
    const allCategories = await getAllShopeeCategories(auth, accessToken, forceRefresh)

    // Helper: build full path for a category
    const byId = new Map(allCategories.map(c => [c.id, c]))
    const fullPath = (id: number): string => {
      const parts: string[] = []
      let cur: number | null = id
      for (let i = 0; i < 6 && cur; i++) {
        const c = byId.get(cur)
        if (!c) break
        parts.unshift(c.name)
        cur = c.parentId || null
      }
      return parts.join(' > ')
    }

    // Text search: return matching leaf categories with full path
    if (query && query.length >= 2) {
      const q = query.toLowerCase()
      const results = allCategories
        .filter(c => !c.hasChildren)
        .map(c => ({ ...c, path: fullPath(c.id) }))
        .filter(c => c.path.toLowerCase().includes(q))
        .slice(0, 40)
      return NextResponse.json({ categories: results })
    }

    // Level-by-level: return immediate children of parentId
    const parentId = parentIdParam !== null ? parseInt(parentIdParam) : 0
    const children = allCategories.filter(c => c.parentId === parentId)

    return NextResponse.json({ categories: children })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
