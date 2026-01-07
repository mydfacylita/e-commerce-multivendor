import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Calcular frete do AliExpress para produtos no carrinho
 * POST /api/shipping/calculate
 */
export async function POST(req: Request) {
  try {
    const { items, shippingAddress } = await req.json()

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: 'Nenhum item fornecido' },
        { status: 400 }
      )
    }

    if (!shippingAddress) {
      return NextResponse.json(
        { message: 'Endereço de entrega não fornecido' },
        { status: 400 }
      )
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

    const crypto = require('crypto')
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Extrair CEP do endereço
    const cepMatch = shippingAddress.match(/(\d{5}-?\d{3})/)
    const cep = cepMatch ? cepMatch[1].replace('-', '') : '01310100' // Default SP

    // Calcular frete para cada item (AliExpress calcula por produto)
    const shippingResults = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { supplier: true }
      })

      // Pular produtos que não são do AliExpress
      if (!product || !product.supplierSku || product.supplier?.name?.toLowerCase() !== 'aliexpress') {
        continue
      }

      const freightQueryData: any = {
        country: 'BR',
        shipToCountry: 'BR',
        productId: product.supplierSku, // Usar supplierSku como ID do produto
        productNum: item.quantity,
        quantity: item.quantity,
        locale: 'en_US',
        currency: 'BRL',
        language: 'en_US',
      }

      // Se houver variantes, adicionar SKU
      // Note: por enquanto não temos um campo específico para o SKU da variante
      // Isso pode ser adicionado ao modelo Product se necessário

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
        const freightResponse = await fetch(freightUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

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
