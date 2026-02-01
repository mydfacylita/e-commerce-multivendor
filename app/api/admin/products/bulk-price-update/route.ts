import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      categoryId, 
      updateType, 
      value, 
      operation, 
      includeVariants = true,
      onlyWithStock = true,
      marginMode = 'adjust' // 'adjust' = ajustar margem existente, 'set' = definir margem fixa
    } = body

    if (value === undefined || value === null) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    // Construir filtro de categoria (incluindo subcategorias)
    let categoryIds: string[] = []
    
    if (categoryId) {
      // Buscar categoria e todas as subcategorias recursivamente
      const getAllChildIds = async (parentId: string): Promise<string[]> => {
        const children = await prisma.category.findMany({
          where: { parentId },
          select: { id: true }
        })
        
        let ids = [parentId]
        for (const child of children) {
          const childIds = await getAllChildIds(child.id)
          ids = [...ids, ...childIds]
        }
        return ids
      }
      
      categoryIds = await getAllChildIds(categoryId)
    }

    // Filtro de produtos
    const productWhere: any = {
      sellerId: null, // Apenas produtos do admin
    }

    if (categoryIds.length > 0) {
      productWhere.categoryId = { in: categoryIds }
    }

    if (onlyWithStock) {
      productWhere.stock = { gt: 0 }
    }

    // Buscar produtos para atualizar
    const products = await prisma.product.findMany({
      where: productWhere,
      select: { 
        id: true, 
        price: true, 
        comparePrice: true,
        costPrice: true,
        variants: true,
        selectedSkus: true  // SKUs selecionados com preços personalizados
      }
    })

    console.log(`📦 Atualizando preços de ${products.length} produtos...`)

    let updatedCount = 0

    // Atualizar cada produto
    for (const product of products) {
      // Calcular novo preço
      let newPrice = product.price
      let newComparePrice = product.comparePrice
      const costPrice = product.costPrice || 0

      if (updateType === 'margin') {
        // MODO MARGEM: Ajusta baseado no custo
        if (costPrice > 0) {
          if (marginMode === 'set') {
            // Definir margem fixa (ex: 30% sobre o custo)
            newPrice = costPrice * (1 + value / 100)
          } else {
            // Ajustar margem existente (ex: diminuir 20 pontos percentuais)
            // Calcular margem atual
            const currentMargin = ((product.price - costPrice) / costPrice) * 100
            const newMargin = operation === 'increase' 
              ? currentMargin + value 
              : currentMargin - value
            
            // Aplicar nova margem (mínimo 0%)
            newPrice = costPrice * (1 + Math.max(0, newMargin) / 100)
          }
        }
      } else if (updateType === 'percentage') {
        const multiplier = operation === 'increase' 
          ? 1 + (value / 100)
          : 1 - (value / 100)
        
        newPrice = Math.max(0.01, product.price * multiplier)
        if (newComparePrice) {
          newComparePrice = Math.max(0.01, newComparePrice * multiplier)
        }
      } else if (updateType === 'fixed') {
        // Valor fixo
        newPrice = operation === 'increase'
          ? product.price + value
          : Math.max(0.01, product.price - value)
        
        if (newComparePrice) {
          newComparePrice = operation === 'increase'
            ? newComparePrice + value
            : Math.max(0.01, newComparePrice - value)
        }
      }

      // Arredondar para 2 casas decimais
      newPrice = Math.round(newPrice * 100) / 100
      if (newComparePrice) {
        newComparePrice = Math.round(newComparePrice * 100) / 100
      }

      // Atualizar variantes se existirem
      let updatedVariants = product.variants
      if (includeVariants && product.variants) {
        try {
          let variantsData: any = product.variants
          if (typeof variantsData === 'string') {
            // Verificar se o JSON é válido antes de parsear
            try {
              variantsData = JSON.parse(variantsData)
            } catch (parseError) {
              console.error(`Erro ao parsear variantes do produto ${product.id}:`, parseError)
              // Pular este produto se o JSON estiver corrompido
              variantsData = null
            }
          }

          // Se é um objeto com skus array
          if (variantsData && variantsData.skus && Array.isArray(variantsData.skus)) {
            variantsData.skus = variantsData.skus.map((sku: any) => {
              if (sku.price && (!onlyWithStock || (sku.stock && sku.stock > 0))) {
                let skuPrice = parseFloat(sku.price)
                const skuCost = parseFloat(sku.cost || sku.costPrice || '0')
                
                if (updateType === 'margin' && skuCost > 0) {
                  // Modo margem para variantes
                  if (marginMode === 'set') {
                    skuPrice = skuCost * (1 + value / 100)
                  } else {
                    const currentMargin = ((skuPrice - skuCost) / skuCost) * 100
                    const newMargin = operation === 'increase' 
                      ? currentMargin + value 
                      : currentMargin - value
                    skuPrice = skuCost * (1 + Math.max(0, newMargin) / 100)
                  }
                } else if (updateType === 'percentage') {
                  const multiplier = operation === 'increase' 
                    ? 1 + (value / 100)
                    : 1 - (value / 100)
                  skuPrice = Math.max(0.01, skuPrice * multiplier)
                } else if (updateType === 'fixed') {
                  skuPrice = operation === 'increase'
                    ? skuPrice + value
                    : Math.max(0.01, skuPrice - value)
                }
                
                sku.price = Math.round(skuPrice * 100) / 100
              }
              return sku
            })
            updatedVariants = JSON.stringify(variantsData)
          }
        } catch (e) {
          console.error('Erro ao atualizar variantes do produto', product.id, e)
        }
      }

      // Atualizar selectedSkus se existir (para produtos importados)
      let updatedSelectedSkus = product.selectedSkus
      if (includeVariants && product.selectedSkus) {
        try {
          let skusData: any[] = []
          
          // selectedSkus pode ser string ou já ser objeto/array
          if (typeof product.selectedSkus === 'string') {
            try {
              skusData = JSON.parse(product.selectedSkus)
            } catch (parseError) {
              console.error(`Erro ao parsear selectedSkus do produto ${product.id}:`, parseError)
              skusData = []
            }
          } else if (Array.isArray(product.selectedSkus)) {
            skusData = product.selectedSkus
          }

          if (Array.isArray(skusData) && skusData.length > 0) {
            skusData = skusData.map((sku: any) => {
              // Campos: costPrice, customPrice, stock, margin, enabled
              const skuCost = parseFloat(sku.costPrice || '0')
              const currentPrice = parseFloat(sku.customPrice || '0')
              const skuStock = sku.stock || sku.customStock || 0  // Pode ser stock ou customStock
              
              // Verificar se deve atualizar este SKU
              const shouldUpdate = sku.enabled !== false && (!onlyWithStock || skuStock > 0)
              
              if (shouldUpdate && skuCost > 0) {
                let newSkuPrice = currentPrice
                
                if (updateType === 'margin') {
                  // Modo margem para SKUs selecionados
                  if (marginMode === 'set') {
                    // Definir margem fixa: preço = custo * (1 + margem/100)
                    newSkuPrice = skuCost * (1 + value / 100)
                    sku.margin = value
                  } else {
                    // Ajustar margem existente
                    const currentMargin = sku.margin !== undefined ? parseFloat(sku.margin) : ((currentPrice - skuCost) / skuCost) * 100
                    const newMargin = operation === 'increase' 
                      ? currentMargin + value 
                      : currentMargin - value
                    newSkuPrice = skuCost * (1 + Math.max(0, newMargin) / 100)
                    sku.margin = Math.max(0, newMargin)
                  }
                } else if (updateType === 'percentage' && currentPrice > 0) {
                  const multiplier = operation === 'increase' 
                    ? 1 + (value / 100)
                    : 1 - (value / 100)
                  newSkuPrice = Math.max(0.01, currentPrice * multiplier)
                } else if (updateType === 'fixed' && currentPrice > 0) {
                  newSkuPrice = operation === 'increase'
                    ? currentPrice + value
                    : Math.max(0.01, currentPrice - value)
                }
                
                // Atualiza o customPrice (preço de venda)
                sku.customPrice = Math.round(newSkuPrice * 100) / 100
              }
              return sku
            })
            updatedSelectedSkus = JSON.stringify(skusData)
          }
        } catch (e) {
          console.error('Erro ao atualizar selectedSkus do produto', product.id, e)
        }
      }

      // Salvar atualização
      await prisma.product.update({
        where: { id: product.id },
        data: {
          price: newPrice,
          comparePrice: newComparePrice,
          variants: updatedVariants,
          selectedSkus: updatedSelectedSkus,
          updatedAt: new Date()
        }
      })

      updatedCount++
    }

    console.log(`✅ ${updatedCount} produtos atualizados com sucesso!`)

    return NextResponse.json({ 
      success: true, 
      updated: updatedCount,
      message: `${updatedCount} produto(s) atualizado(s)`
    })

  } catch (error) {
    console.error('Erro ao atualizar preços em massa:', error)
    return NextResponse.json({ error: 'Erro ao processar atualização' }, { status: 500 })
  }
}
