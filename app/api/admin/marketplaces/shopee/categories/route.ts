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
let categoryCache: { categories: any[]; rawList: any[]; timestamp: number } | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

async function getAllShopeeCategories(auth: any, accessToken: string, forceRefresh = false): Promise<{ categories: any[]; rawList: any[] }> {
  if (!forceRefresh && categoryCache && Date.now() - categoryCache.timestamp < CACHE_TTL) {
    return { categories: categoryCache.categories, rawList: categoryCache.rawList }
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

  // LOG COMPLETO SEM LIMITE
  console.log('===== SHOPEE GET_CATEGORY RESPONSE COMPLETO =====')
  console.log(JSON.stringify(data, null, 2))
  console.log('===== FIM RESPONSE =====')

  // O warning lista IDs desatualizados (ex: 100198) → filtrar para ficar só com os novos (ex: 100268)
  const outdatedIds = new Set<number>()
  const warningStr: string = data?.warning || ''
  const warnRegex = /CategoryID\[(\d+)\]/g
  let wm
  while ((wm = warnRegex.exec(warningStr)) !== null) {
    outdatedIds.add(parseInt(wm[1]))
  }
  if (outdatedIds.size > 0) console.log(`[Shopee categories] IDs desatualizados removidos (${outdatedIds.size}):`, [...outdatedIds].join(', '))
  console.log(`[Shopee categories] get_category retornou ${raw.length} categorias, após filtro: ${raw.length - outdatedIds.size}`)
  // Amostra da estrutura para diagnóstico
  console.log('[Shopee categories] amostra 3 primeiras raw:', JSON.stringify(raw.slice(0, 3)))
  console.log('[Shopee categories] amostra 3 últimas raw:', JSON.stringify(raw.slice(-3)))

  const categories = raw
    .filter((c: any) => !outdatedIds.has(c.category_id))
    .map((c: any) => ({
      id: c.category_id as number,
      name: (c.display_category_name || c.category_name || '') as string,
      parentId: (c.parent_category_id || 0) as number,
      hasChildren: !!(c.has_children),
    }))

  categoryCache = { categories, rawList: raw, timestamp: Date.now() }
  return { categories, rawList: raw }
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
    const { categories: allCategories, rawList } = await getAllShopeeCategories(auth, accessToken, forceRefresh)

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

    // Log com TODOS os campos raw da Shopee
    const rawChildren = rawList.filter((c: any) => (c.parent_category_id || 0) === parentId)
    console.log(`[Shopee categories] parentId=${parentId} → ${rawChildren.length} filhos COMPLETO:`)
    console.log(JSON.stringify(rawChildren, null, 2))

    return NextResponse.json({ categories: children })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
