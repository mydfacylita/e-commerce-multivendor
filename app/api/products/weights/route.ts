import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-security'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

    const { productIds } = await req.json()

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds é obrigatório e deve ser um array' },
        { status: 400 }
      )
    }

    console.log('🚚 [Shipping] Calculando peso para produtos:', productIds)

    // Limpar IDs de produtos (remover sufixos de variantes como _none_none ou _size_color)
    const cleanProductIds = productIds.map((item: any) => {
      let cleanId = item.id
      // Se o ID contém underscore, pegar apenas a primeira parte (ID real do produto)
      if (cleanId && cleanId.includes('_')) {
        cleanId = cleanId.split('_')[0]
      }
      return cleanId
    })

    console.log('🔍 [Shipping] IDs limpos:', cleanProductIds)

    // Buscar pesos dos produtos
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: cleanProductIds
        }
      },
      select: {
        id: true,
        name: true,
        weightWithPackage: true,
        weight: true
      }
    })

    console.log('📦 [Shipping] Produtos encontrados:', products.length)

    // Calcular peso total
    let totalWeight = 0
    const itemsWithWeight = []
    
    for (let i = 0; i < productIds.length; i++) {
      const item = productIds[i]
      const cleanId = cleanProductIds[i]
      const product = products.find(p => p.id === cleanId)
      if (product) {
        // Preferir peso com embalagem, senão usar peso sem embalagem, senão 0.5kg padrão
        const productWeight = product.weightWithPackage || product.weight || 0.5
        const itemWeight = productWeight * (item.quantity || 1)
        totalWeight += itemWeight
        
        itemsWithWeight.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity || 1,
          unitWeight: productWeight,
          totalWeight: itemWeight,
          hasWeight: !!(product.weight || product.weightWithPackage)
        })
        
        console.log(`📦 [Shipping] ${product.name}: ${productWeight}kg x ${item.quantity || 1} = ${itemWeight}kg`)
      } else {
        // Se produto não encontrado, usar 0.5kg padrão
        const defaultWeight = 0.5 * (item.quantity || 1)
        totalWeight += defaultWeight
        
        itemsWithWeight.push({
          productId: item.id,
          productName: 'Produto não encontrado',
          quantity: item.quantity || 1,
          unitWeight: 0.5,
          totalWeight: defaultWeight,
          hasWeight: false
        })
        
        console.log(`⚠️ [Shipping] Produto ${item.id} não encontrado, usando peso padrão: 0.5kg x ${item.quantity || 1}`)
      }
    }

    console.log(`🚚 [Shipping] Peso total calculado: ${totalWeight}kg`)

    return NextResponse.json({
      totalWeight: parseFloat(totalWeight.toFixed(2)),
      itemsWithWeight,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        weight: p.weight,
        weightWithPackage: p.weightWithPackage
      }))
    })

  } catch (error: any) {
    console.error('❌ [Shipping] Erro ao calcular peso:', error)
    return NextResponse.json(
      { error: 'Erro ao calcular peso', details: error.message },
      { status: 500 }
    )
  }
}
