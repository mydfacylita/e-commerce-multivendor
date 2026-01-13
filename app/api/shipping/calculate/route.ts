import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/api-middleware'
import { isValidCEP } from '@/lib/validation'
import { validateApiKey } from '@/lib/api-security'
import * as crypto from 'crypto'

/**
 * 🔒 Fetch com timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Calcular frete do AliExpress para produtos no carrinho
 * POST /api/shipping/calculate
 */
export async function POST(req: NextRequest) {
  try {
    // 🔐 Validar API Key
    const apiKey = req.headers.get('x-api-key')
    const validation = await validateApiKey(apiKey)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'API Key inválida' },
        { status: 401 }
      )
    }

    // 🔒 Rate limiting: 30 requisições por minuto por IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const rateLimitResult = applyRateLimit(`shipping:${ip}`, {
      maxRequests: 30,
      windowMs: 60000
    })
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response
    }

    const body = await req.json()
    const { items, shippingAddress, zipCode } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: 'Nenhum item fornecido' },
        { status: 400 }
      )
    }

    // 🔒 Limitar número de itens para evitar abuso
    if (items.length > 50) {
      return NextResponse.json(
        { message: 'Máximo de 50 itens permitido' },
        { status: 400 }
      )
    }

    // 🔒 Validar IDs de produtos (devem ser strings)
    if (items.some((i: any) => typeof i.productId !== 'string')) {
      return NextResponse.json(
        { message: 'IDs de produtos inválidos' },
        { status: 400 }
      )
    }

    if (!shippingAddress && !zipCode) {
      return NextResponse.json(
        { message: 'Endereço de entrega não fornecido' },
        { status: 400 }
      )
    }

    // 🔒 Validar e extrair CEP
    let cep: string
    if (zipCode) {
      const cleanZip = zipCode.replace(/\D/g, '')
      if (!isValidCEP(cleanZip)) {
        return NextResponse.json(
          { message: 'CEP inválido' },
          { status: 400 }
        )
      }
      cep = cleanZip
    } else {
      const cepMatch = shippingAddress.match(/(\d{5}-?\d{3})/)
      cep = cepMatch ? cepMatch[1].replace('-', '') : '01310100'
    }

    // 🔒 Verificar se produtos existem no banco
    const productIds = items.map((i: any) => i.productId)
    const validProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: { supplier: true }
    })

    if (validProducts.length === 0) {
      return NextResponse.json({
        shippingCost: 0,
        shippingMethod: 'Frete Grátis',
        estimatedDeliveryDays: '30-45',
        note: 'Nenhum produto válido encontrado',
      })
    }

    // Buscar credenciais do AliExpress
    const auth = await prisma.aliExpressAuth.findFirst()
    if (!auth || !auth.accessToken) {
      // Se não tiver credenciais, retornar frete estimado
      return NextResponse.json({
        shippingCost: 0,
        shippingMethod: 'Frete Grátis',
        estimatedDeliveryDays: '30-45',
        note: 'Frete calculado no checkout',
      })
    }

    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Calcular frete para cada item (AliExpress calcula por produto)
    const shippingResults = []

    for (const item of items) {
      const product = validProducts.find(p => p.id === item.productId)

      // Pular produtos que não são do AliExpress
      if (!product || !product.supplierSku || product.supplier?.name?.toLowerCase() !== 'aliexpress') {
        continue
      }

      const freightQueryData: any = {
        country: 'BR',
        shipToCountry: 'BR',
        productId: product.supplierSku,
        productNum: Math.min(item.quantity || 1, 100), // 🔒 Limitar quantidade
        quantity: Math.min(item.quantity || 1, 100),
        locale: 'en_US',
        currency: 'BRL',
        language: 'en_US',
      }

      const freightParams: Record<string, any> = {
        app_key: auth.appKey,
        method: 'aliexpress.ds.freight.query',
        session: auth.accessToken,
        timestamp: timestamp,
        format: 'json',
        v: '2.0',
        sign_method: 'sha256',
        queryDeliveryReq: JSON.stringify(freightQueryData),
      }

      // Gerar assinatura
      const sortedKeys = Object.keys(freightParams).filter(key => key !== 'sign').sort()
      const signString = sortedKeys.map(key => `${key}${freightParams[key]}`).join('')
      const signature = crypto.createHmac('sha256', auth.appSecret)
        .update(signString)
        .digest('hex')
        .toUpperCase()
      freightParams.sign = signature

      try {
        const freightUrl = `${apiUrl}?${new URLSearchParams(freightParams).toString()}`
        
        // 🔒 Fetch com timeout de 10 segundos
        const freightResponse = await fetchWithTimeout(freightUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }, 10000)

        const freightData = await freightResponse.json()

        if (freightData.aliexpress_ds_freight_query_response?.result) {
          const result = freightData.aliexpress_ds_freight_query_response.result
          const freightOptions = 
            result.aeop_freight_calculate_result_for_buyer_d_t_o_list ||
            result.freight_list ||
            result.result_list ||
            []

          if (Array.isArray(freightOptions) && freightOptions.length > 0) {
            const cheapest = freightOptions.reduce((min: any, curr: any) => {
              const minPrice = parseFloat(min.freight_amount || min.price || '999999')
              const currPrice = parseFloat(curr.freight_amount || curr.price || '999999')
              return currPrice < minPrice ? curr : min
            }, freightOptions[0])

            shippingResults.push({
              productId: product.id,
              productName: product.name,
              cost: parseFloat(cheapest.freight_amount || cheapest.price || '0'),
              method: cheapest.service_name || cheapest.serviceName || 'Standard',
              days: cheapest.estimated_delivery_time || '30-45',
            })
          }
        }
      } catch (error) {
        console.error('[Shipping] Erro ao calcular frete para produto:', product.id, error)
        // Continuar com outros produtos
      }
    }

    if (shippingResults.length === 0) {
      // Nenhum frete calculado - retornar estimativa
      return NextResponse.json({
        shippingCost: 0,
        shippingMethod: 'Frete Grátis',
        estimatedDeliveryDays: '30-45',
        note: 'Frete internacional gratuito',
      })
    }

    // Somar todos os fretes
    const totalShippingCost = shippingResults.reduce((sum, item) => sum + item.cost, 0)
    const fastestDays = Math.min(...shippingResults.map(r => {
      const match = r.days.match(/\d+/)
      return match ? parseInt(match[0]) : 30
    }))
    const slowestDays = Math.max(...shippingResults.map(r => {
      const match = r.days.match(/\d+/)
      return match ? parseInt(match[0]) : 45
    }))

    return NextResponse.json({
      shippingCost: totalShippingCost,
      shippingMethod: shippingResults[0].method,
      estimatedDeliveryDays: `${fastestDays}-${slowestDays}`,
      breakdown: shippingResults,
    })
  } catch (error: any) {
    console.error('[Shipping] Erro ao calcular frete:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular frete', error: error.message },
      { status: 500 }
    )
  }
}
