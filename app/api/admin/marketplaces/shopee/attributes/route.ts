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

// POST /api/admin/marketplaces/shopee/attributes
// Body: { category_id, locale, productId?, itemName? }
// Returns attributes for a given Shopee category.
// If productId is provided, tries to auto-map product specs to attribute values.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const categoryId = body.category_id ? String(body.category_id) : null
    const itemName = body.itemName || ''
    const productId = body.productId || ''
    const locale = body.locale || 'pt-br'
    if (!categoryId) return NextResponse.json({ error: 'category_id obrigatório' }, { status: 400 })

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, include: { shopeeAuth: true } })
    if (!adminUser?.shopeeAuth?.accessToken) return NextResponse.json({ error: 'Shopee não configurada' }, { status: 400 })

    const auth = adminUser.shopeeAuth
    const accessToken = await refreshIfNeeded(auth, adminUser.id)

    console.log(`[Shopee attrs] ▶ category_id: ${categoryId} | locale: ${locale} | itemName: "${itemName.substring(0, 60)}" | productId: ${productId}`)

    // get_attribute_tree — Open Platform BR: GET com category_id_list + language
    const path = '/api/v2/product/get_attribute_tree'
    const ts = Math.floor(Date.now() / 1000)
    const sign = shopeeSign(auth.partnerId, path, ts, accessToken, auth.shopId, auth.partnerKey)
    const BR_BASE = 'https://openplatform.shopee.com.br'
    const url = `${BR_BASE}${path}?partner_id=${auth.partnerId}&timestamp=${ts}&sign=${sign}&access_token=${accessToken}&shop_id=${auth.shopId}&category_id_list=${categoryId}&language=pt-BR`
    console.log(`[Shopee attrs] GET ${url.replace(accessToken, 'TOKEN***')}`)
    const treeRes = await fetch(url, { method: 'GET' })
    const rawText = await treeRes.text()
    console.log(`[Shopee attrs] Resposta raw (primeiros 2000 chars):`, rawText.substring(0, 2000))
    let treeData: any = {}
    try { treeData = JSON.parse(rawText) } catch (e) { console.log('[Shopee attrs] ERRO ao parsear JSON:', e) }

    let raw: any[] = []
    let apiUsed = 'none'

    // Estrutura real da API: { response: { list: [{ category_id, attribute_tree: [...] }] } }
    const list = treeData?.response?.list
    if (Array.isArray(list) && list.length > 0) {
      for (const item of list) {
        const attrs = item?.attribute_tree || item?.attribute_list || []
        if (attrs.length > 0) { raw = attrs; break }
      }
      if (raw.length > 0) apiUsed = 'get_attribute_tree'
    }

    console.log(`[Shopee attrs] RESULTADO: apiUsed="${apiUsed}" | atributos: ${raw.length}`)
    if (raw.length > 0) console.log('[Shopee attrs] Primeiro atributo raw:', JSON.stringify(raw[0]))

    // input_type como número: 1=TEXT_FIELD 2=COMBO_BOX 3=MULTIPLE_SELECT 4=DATE 5=MULTIPLE_SELECT 6=NUMERIC 7=TEXT_FIELD_WITH_UNIT
    const inputTypeMap: Record<number, string> = { 1: 'TEXT_FIELD', 2: 'COMBO_BOX', 3: 'MULTIPLE_SELECT', 4: 'DATE', 5: 'MULTIPLE_SELECT', 6: 'NUMERIC', 7: 'TEXT_FIELD_WITH_UNIT' }

    const attributes = raw.map((attr: any) => {
      // Nome em pt-BR via multi_lang
      const ptName = attr.multi_lang?.find((m: any) => m.language === 'pt-BR')?.value || ''
      const inputTypeNum: number = attr.attribute_info?.input_type ?? 1
      return {
        attribute_id: attr.attribute_id,
        attribute_name: ptName || attr.name || attr.attribute_name || '',
        display_attr_name: ptName || attr.name || '',
        is_mandatory: !!(attr.mandatory || attr.is_mandatory),
        input_type: inputTypeMap[inputTypeNum] || `TYPE_${inputTypeNum}`,
        input_type_raw: inputTypeNum,
        // Valores predefinidos com tradução pt-BR
        values: (attr.attribute_value_list || []).map((v: any) => {
          const ptVal = v.multi_lang?.find((m: any) => m.language === 'pt-BR')?.value || ''
          return {
            value_id: v.value_id,
            name: ptVal || v.name || String(v.value_id),
            display_value_name: ptVal || v.name || '',
          }
        }),
      }
    })

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
            const attrName = (attr.attribute_name || '').toLowerCase()
            const attrId = attr.attribute_id

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
    if (attributes.length > 0) console.log('[Shopee attrs] Atributos mapeados:', JSON.stringify(attributes.map(a => ({ id: a.attribute_id, name: a.attribute_name, mandatory: a.is_mandatory, input_type: a.input_type, values: a.values.length }))))
    return NextResponse.json({ attributes, apiUsed, suspended: raw.length === 0, prefill })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
