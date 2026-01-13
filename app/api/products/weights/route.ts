import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-security'

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

    // Buscar pesos dos produtos
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds.map((item: any) => item.id)
        }
      },
      select: {
        id: true,
        weightWithPackage: true,
        weight: true
      }
    })

    // Calcular peso total
    let totalWeight = 0
    
    for (const item of productIds) {
      const product = products.find(p => p.id === item.id)
      if (product) {
        // Preferir peso com embalagem, senão usar peso sem embalagem, senão 0.5kg padrão
        const productWeight = product.weightWithPackage || product.weight || 0.5
        totalWeight += productWeight * item.quantity
      } else {
        // Se produto não encontrado, usar 0.5kg padrão
        totalWeight += 0.5 * item.quantity
      }
    }

    return NextResponse.json({
      totalWeight: parseFloat(totalWeight.toFixed(2)),
      products: products.map(p => ({
        id: p.id,
        weight: p.weight,
        weightWithPackage: p.weightWithPackage
      }))
    })

  } catch (error: any) {
    console.error('Erro ao calcular peso:', error)
    return NextResponse.json(
      { error: 'Erro ao calcular peso', details: error.message },
      { status: 500 }
    )
  }
}
