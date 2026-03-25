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

// GET /api/admin/marketplaces/shopee/attributes?categoryId=100419&itemName=...&productId=...
// Returns attributes for a given Shopee category.
// If productId is provided, tries to auto-map product specs to attribute values.
// Tries: get_attribute_tree → get_recommend_attribute → get_attributes (usually suspended)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const itemName = searchParams.get('itemName') || ''
    const productId = searchParams.get('productId') || ''
    if (!categoryId) return NextResponse.json({ error: 'categoryId obrigatório' }, { status: 400 })

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, include: { shopeeAuth: true } })
    if (!adminUser?.shopeeAuth?.accessToken) return NextResponse.json({ error: 'Shopee não configurada' }, { status: 400 })

    const auth = adminUser.shopeeAuth
    const accessToken = await refreshIfNeeded(auth, adminUser.id)

    console.log(`[Shopee attrs] ▶ category_id recebido: ${categoryId} | itemName: "${itemName.substring(0, 60)}" | productId: ${productId}`)

    // get_attribute_tree — POST com body JSON {category_id, locale}
    const path = '/api/v2/product/get_attribute_tree'
    const ts = Math.floor(Date.now() / 1000)
    const sign = shopeeSign(auth.partnerId, path, ts, accessToken, auth.shopId, auth.partnerKey)
    const url = `${SHOPEE_API_BASE}${path}?partner_id=${auth.partnerId}&timestamp=${ts}&sign=${sign}&access_token=${accessToken}&shop_id=${auth.shopId}`
    const body = JSON.stringify({ category_id: Number(categoryId), locale: 'pt-br' })
    console.log(`[Shopee attrs] POST ${url.replace(accessToken, 'TOKEN***')} body=${body}`)
    const treeRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    const treeData = await treeRes.json()
    console.log(`[Shopee attrs] JSON completo:`, JSON.stringify(treeData))

    let raw: any[] = []
    let apiUsed = 'none'
    if (!treeData.error || treeData.error === '') {
      const resp = treeData?.response || {}
      if (resp?.category_list?.length > 0) {
        for (const cat of resp.category_list) {
          const list = cat?.attribute_list || cat?.attributes || []
          if (list.length > 0) { raw = list; break }
        }
      }
      if (!raw.length) raw = resp?.attribute_list || resp?.attributes || resp?.attribute_info_list || resp?.data || []
      if (!raw.length && Array.isArray(resp)) raw = resp
      if (raw.length > 0) apiUsed = 'get_attribute_tree'
    }

    console.log(`[Shopee attrs] RESULTADO: apiUsed="${apiUsed}" | atributos: ${raw.length}`)
    if (raw.length > 0) console.log('[Shopee attrs] Primeiro atributo raw:', JSON.stringify(raw[0]))

    const attributes = raw.map((attr: any) => ({
      id: attr.attribute_id,
      name: attr.display_attribute_name || attr.attribute_name || '',
      isMandatory: !!(attr.is_mandatory || attr.mandatory),
      inputType: attr.input_type || 'TEXT_FIELD',
      // Include predefined value list if available (from get_attribute_tree they might be here)
      values: (attr.attribute_value_list || []).map((v: any) => ({
        value_id: v.value_id,
        name: v.display_value_name || v.value_name || String(v.value_id),
        display_value_name: v.display_value_name || v.value_name || '',
      })),
    }))

    // Auto-map product specs to attributes if productId is provided
    let prefill: Record<number, { value: string | number; matched: boolean; source: string }> = {}
    if (productId && attributes.length > 0) {
      try {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: { category: true, supplier: true },
        })
        if (product) {
          // Parse product specs (AliExpress format [{nome,valor}] or object)
          const parseSpecs = (raw: string | null | undefined): Record<string, string> => {
            if (!raw) return {}
            try {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) {
                const out: Record<string, string> = {}
                for (const item of parsed) {
                  const key = (item.nome || item.name || item.key || '').replace(/^\d+\.\s*/, '').trim()
                  const val = String(item.valor || item.value || item.val || '')
                  if (key) out[key.toLowerCase()] = val
                }
                return out
              }
              if (typeof parsed === 'object' && parsed !== null) {
                const out: Record<string, string> = {}
                for (const [k, v] of Object.entries(parsed)) out[k.toLowerCase()] = String(v)
                return out
              }
            } catch {}
            return {}
          }

          const specs: Record<string, string> = {
            ...parseSpecs(product.specifications),
            ...parseSpecs(product.attributes),
            ...parseSpecs(product.technicalSpecs),
          }

          // Direct product fields map
          const fieldMap: Record<string, string> = {
            brand: product.brand || '', marca: product.brand || '',
            model: product.model || product.name?.substring(0, 100) || '',
            'model name': product.model || product.name?.substring(0, 100) || '',
            modelo: product.model || product.name?.substring(0, 100) || '',
            color: (product as any).color || '', cor: (product as any).color || '',
            gtin: product.gtin || '', ean: product.gtin || '',
            weight: product.weight ? String(product.weight) : '',
            peso: product.weight ? String(product.weight) : '',
            country: (product as any).shipFromCountry || 'BR',
            origem: (product as any).shipFromCountry || 'BR',
            'país de origem': (product as any).shipFromCountry || 'BR',
            ...specs,
          }

          const productText = `${product.name || ''} ${product.category?.name || ''} ${product.description || ''}`.toLowerCase()

          for (const attr of attributes) {
            const attrName = attr.name.toLowerCase()
            const attrId = attr.id

            // Find matching value from fieldMap
            let matchedValue: string | null = null
            let matchSource = ''
            for (const [key, val] of Object.entries(fieldMap)) {
              if (val && (attrName.includes(key) || key.includes(attrName))) {
                matchedValue = val
                matchSource = key
                break
              }
            }

            if (attr.values && attr.values.length > 0) {
              // Predefined values: try to match
              let match: any = null
              if (matchedValue) {
                const lower = matchedValue.toLowerCase()
                match = attr.values.find((v: any) =>
                  (v.name || '').toLowerCase() === lower ||
                  (v.name || '').toLowerCase().includes(lower) ||
                  lower.includes((v.name || '').toLowerCase())
                )
              }
              // Try matching from product text
              if (!match) {
                for (const v of attr.values) {
                  const vn = (v.name || '').toLowerCase()
                  if (vn && vn.length > 2 && productText.includes(vn)) {
                    match = v
                    matchSource = 'productText'
                    break
                  }
                }
              }
              if (match) {
                prefill[attrId] = { value: match.value_id, matched: true, source: matchSource || 'predefined' }
              }
            } else if (matchedValue) {
              // Text field: use the matched value directly
              prefill[attrId] = { value: matchedValue.substring(0, 256), matched: true, source: matchSource }
            }
          }
        }
      } catch (e: any) {
        console.error('[Shopee attributes] Erro ao mapear specs do produto:', e.message)
      }
    }

    console.log(`[Shopee attrs] FINAL: ${attributes.length} atributos | prefill keys: ${Object.keys(prefill).join(',') || 'nenhum'} | suspended=${raw.length === 0}`)
    if (attributes.length > 0) console.log('[Shopee attrs] Atributos mapeados:', JSON.stringify(attributes.map(a => ({ id: a.id, name: a.name, mandatory: a.isMandatory, values: a.values.length }))))
    return NextResponse.json({ attributes, apiUsed, suspended: raw.length === 0, prefill })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
