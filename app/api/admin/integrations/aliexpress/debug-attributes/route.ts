import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function generateSign(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort()
  const signString = sortedKeys.map(k => `${k}${params[k]}`).join('')
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase()
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const forceProductId = searchParams.get('productId') // opcional: testar produto específico

  // 1. Buscar um produto dropshipping sem atributos
  const product = forceProductId
    ? await prisma.product.findFirst({
        where: { supplierSku: { contains: forceProductId } },
        select: { id: true, name: true, supplierSku: true, attributes: true }
      })
    : await prisma.product.findFirst({
        where: {
          isDropshipping: true,
          OR: [{ attributes: null }, { attributes: '' }, { attributes: '[]' }],
          supplierSku: { startsWith: 'ali_' }
        },
        select: { id: true, name: true, supplierSku: true, attributes: true }
      })

  if (!product) {
    return NextResponse.json({ message: 'Nenhum produto dropshipping sem atributos encontrado!' })
  }

  const aliProductId = (product.supplierSku || '').replace('ali_', '')

  // 2. Buscar credenciais
  const auth = await prisma.aliExpressAuth.findFirst()
  if (!auth?.accessToken) {
    return NextResponse.json({ error: 'Credenciais AliExpress não configuradas' }, { status: 400 })
  }

  // 3. Chamar API
  const params: Record<string, string> = {
    app_key: auth.appKey,
    method: 'aliexpress.ds.product.get',
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    timestamp: Date.now().toString(),
    session: auth.accessToken,
    product_id: aliProductId,
    ship_to_country: 'BR',
    target_currency: 'BRL',
    target_language: 'pt'
  }
  params.sign = generateSign(params, auth.appSecret)

  const url = `https://api-sg.aliexpress.com/sync?${Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
  const response = await fetch(url)
  const data = await response.json()

  const result = data.aliexpress_ds_product_get_response?.result
  if (!result) {
    return NextResponse.json({
      produto: { id: product.id, name: product.name, supplierSku: product.supplierSku, aliProductId },
      erro: data.error_response || 'API não retornou resultado',
      rawResponse: data
    })
  }

  const baseInfo = result.ae_item_base_info_dto || {}

  // 4. Analisar mobile_detail
  let mobileDetailSpecs: any[] = []
  let mobileDetailError: string | null = null
  const mobileDetailRaw: string = baseInfo.mobile_detail || ''
  if (mobileDetailRaw) {
    try {
      const md = JSON.parse(mobileDetailRaw)
      const moduleList: any[] = md.moduleList || []
      for (const mod of moduleList) {
        if (mod.type !== 'text') continue
        const content: string = (mod.data?.content || '').trim()
        if (!content) continue
        const colonIdx = content.indexOf(': ')
        if (colonIdx > 0 && colonIdx < 80 && !content.includes('\n')) {
          const key = content.substring(0, colonIdx).trim()
          const value = content.substring(colonIdx + 2).trim()
          if (key && value) mobileDetailSpecs.push({ nome: key, valor: value })
        }
      }
    } catch (e: any) {
      mobileDetailError = e.message
    }
  }

  // 5. Analisar ae_item_properties
  const propsRaw = result.ae_item_properties?.ae_item_property
  let itemProperties: any[] = []
  if (propsRaw) {
    const propList: any[] = Array.isArray(propsRaw) ? propsRaw : [propsRaw]
    itemProperties = propList.map((p: any) => ({ nome: p.attr_name, valor: p.attr_value }))
  }

  // 6. Diagnóstico hasAttributes
  const rawAttr = (product as any).attributes
  let hasAttributesDiag = 'false — vai processar'
  if (rawAttr && rawAttr !== '[]' && rawAttr !== 'null') {
    try {
      const parsed = JSON.parse(rawAttr)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].nome !== undefined) {
        hasAttributesDiag = `true — JÁ TEM ${parsed.length} atributos no formato correto — SYNC ESTÁ PULANDO`
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        hasAttributesDiag = `false — tem ${parsed.length} atributos mas no formato ERRADO (${JSON.stringify(Object.keys(parsed[0]))}), vai reescrever`
      }
    } catch {
      hasAttributesDiag = 'false — JSON inválido, vai processar'
    }
  }

  return NextResponse.json({
    produto: {
      id: product.id,
      name: product.name,
      supplierSku: product.supplierSku,
      aliProductId,
      attributes_no_banco: (product as any).attributes
    },
    diagnostico: {
      hasAttributes: hasAttributesDiag,
      mobile_detail_existe: !!mobileDetailRaw,
      mobile_detail_specs_encontradas: mobileDetailSpecs.length,
      mobile_detail_erro: mobileDetailError,
      ae_item_properties_encontradas: itemProperties.length,
      conclusao: mobileDetailSpecs.length > 0
        ? `✅ mobile_detail tem ${mobileDetailSpecs.length} specs — deveria funcionar`
        : itemProperties.length > 0
          ? `✅ ae_item_properties tem ${itemProperties.length} props — fallback deveria funcionar`
          : '❌ Nenhuma fonte de atributos disponível para este produto'
    },
    specs_mobile_detail: mobileDetailSpecs,
    specs_ae_item_properties: itemProperties,
  }, { status: 200 })
}
