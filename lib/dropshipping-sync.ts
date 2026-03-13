import { prisma } from './prisma'

export interface DropshippingSyncResult {
  synced: number
  inactivated: number
  errors: string[]
  details: {
    productId: string
    sellerId: string
    sellerName: string
    action: 'synced' | 'inactivated' | 'error'
    reason?: string
  }[]
}

/**
 * Sincroniza todos os produtos dropshipping quando o produto original é atualizado
 * 
 * @param sourceProductId - ID do produto original (do admin)
 * @param updatedFields - Campos que foram atualizados
 */
export async function syncDropshippingProducts(
  sourceProductId: string,
  updatedFields: Record<string, any>
): Promise<DropshippingSyncResult> {
  const result: DropshippingSyncResult = {
    synced: 0,
    inactivated: 0,
    errors: [],
    details: []
  }

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 [SYNC] Sincronizando produtos dropshipping...')
    console.log('   🆔 Produto Original:', sourceProductId)

    // Buscar produto original atualizado
    const sourceProduct = await prisma.product.findUnique({
      where: { id: sourceProductId }
    })

    if (!sourceProduct) {
      console.log('❌ Produto original não encontrado')
      result.errors.push('Produto original não encontrado')
      return result
    }

    // Verificar se é um produto dropshipping do admin (sem sellerId)
    if (sourceProduct.sellerId) {
      console.log('⚠️  Produto não é do admin (tem sellerId) - ignorando sync')
      return result
    }

    if (!sourceProduct.isDropshipping) {
      console.log('⚠️  Produto não é dropshipping - ignorando sync')
      return result
    }

    // Buscar todos os produtos que estão dropando este produto
    const droppedProducts = await prisma.product.findMany({
      where: {
        supplierSku: sourceProductId,
        sellerId: { not: null }
      },
      include: {
        seller: true
      }
    })

    console.log(`   📦 Encontrados ${droppedProducts.length} produtos dropando`)

    if (droppedProducts.length === 0) {
      console.log('   ✅ Nenhum produto para sincronizar')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      return result
    }

    // Preço base do produto original (preço mínimo que vendedor deve praticar)
    const precoBase = sourceProduct.price
    console.log(`   💰 Preço base do admin: R$ ${precoBase.toFixed(2)}`)
    console.log(`   📌 Status ADM: active=${sourceProduct.active}, isDropshipping=${sourceProduct.isDropshipping}`)

    // REGRA: Se produto ADM está inativo ou não é mais dropshipping, desativar TODOS os drops
    if (!sourceProduct.active || !sourceProduct.isDropshipping) {
      console.log(`   ⛔ Produto ADM indisponível - desativando TODOS os drops...`)
      
      for (const droppedProduct of droppedProducts) {
        const sellerName = droppedProduct.seller?.storeName || 'Vendedor desconhecido'
        
        if (droppedProduct.active) {
          const reason = !sourceProduct.active 
            ? 'admin_product_inactive' 
            : 'admin_product_not_available_for_dropship'
          
          await prisma.product.update({
            where: { id: droppedProduct.id },
            data: { 
              active: false,
              lastSyncAt: new Date()
            }
          })
          
          console.log(`   ⛔ Vendedor ${sellerName}: DESATIVADO (${reason})`)
          result.inactivated++
          result.details.push({
            productId: droppedProduct.id,
            sellerId: droppedProduct.sellerId!,
            sellerName,
            action: 'inactivated',
            reason: reason === 'admin_product_inactive' 
              ? 'Produto original inativo' 
              : 'Produto não disponível para dropship'
          })
        } else {
          console.log(`   ✅ Vendedor ${sellerName}: já estava desativado`)
        }
      }
      
      console.log('\n📊 RESULTADO DA SINCRONIZAÇÃO:')
      console.log(`   ⛔ Inativados: ${result.inactivated}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      return result
    }

    // Dados que SEMPRE são sincronizados do produto original (dados fiscais)
    const syncData: Record<string, any> = {
      // Dados fiscais - SEMPRE copiados do original
      gtin: sourceProduct.gtin,
      ncm: sourceProduct.ncm,
      cest: sourceProduct.cest,
      origem: sourceProduct.origem,
      cfopInterno: sourceProduct.cfopInterno,
      cfopInterestadual: sourceProduct.cfopInterestadual,
      unidadeComercial: sourceProduct.unidadeComercial,
      unidadeTributavel: sourceProduct.unidadeTributavel,
      // Estoque - SEMPRE sincronizado
      stock: sourceProduct.stock,
      supplierStock: sourceProduct.stock,
      // Se mudou o preço base, atualizar costPrice
      costPrice: sourceProduct.price,
      // Timestamp
      lastSyncAt: new Date()
    }

    // Campos opcionais - só sincroniza se foram alterados no request
    if (updatedFields.description !== undefined) {
      syncData.description = updatedFields.description
    }

    if (updatedFields.images !== undefined) {
      // Converter para JSON string se for array
      syncData.images = Array.isArray(updatedFields.images) 
        ? JSON.stringify(updatedFields.images) 
        : updatedFields.images
    }

    if (updatedFields.variants !== undefined) {
      // Converter para JSON string se for array/objeto
      syncData.variants = typeof updatedFields.variants === 'object'
        ? JSON.stringify(updatedFields.variants)
        : updatedFields.variants
    }

    if (updatedFields.sizes !== undefined) {
      // Converter para JSON string se for array/objeto
      syncData.sizes = typeof updatedFields.sizes === 'object'
        ? JSON.stringify(updatedFields.sizes)
        : updatedFields.sizes
    }

    if (updatedFields.sizeType !== undefined) {
      syncData.sizeType = updatedFields.sizeType
    }

    if (updatedFields.sizeCategory !== undefined) {
      syncData.sizeCategory = updatedFields.sizeCategory
    }

    if (updatedFields.categoryId !== undefined) {
      syncData.category = { connect: { id: updatedFields.categoryId } }
    }

    if (updatedFields.dropshippingCommission !== undefined) {
      syncData.dropshippingCommission = updatedFields.dropshippingCommission
    }

    if (updatedFields.specifications !== undefined) {
      syncData.specifications = typeof updatedFields.specifications === 'object'
        ? JSON.stringify(updatedFields.specifications)
        : updatedFields.specifications
    }

    if (updatedFields.attributes !== undefined) {
      syncData.attributes = typeof updatedFields.attributes === 'object'
        ? JSON.stringify(updatedFields.attributes)
        : updatedFields.attributes
    }

    if (updatedFields.technicalSpecs !== undefined) {
      syncData.technicalSpecs = typeof updatedFields.technicalSpecs === 'object'
        ? JSON.stringify(updatedFields.technicalSpecs)
        : updatedFields.technicalSpecs
    }

    if (updatedFields.brand !== undefined) {
      syncData.brand = updatedFields.brand
    }

    if (updatedFields.color !== undefined) {
      syncData.color = updatedFields.color
    }

    // Peso e dimensões
    if (updatedFields.weight !== undefined) syncData.weight = updatedFields.weight
    if (updatedFields.weightWithPackage !== undefined) syncData.weightWithPackage = updatedFields.weightWithPackage
    if (updatedFields.length !== undefined) syncData.length = updatedFields.length
    if (updatedFields.width !== undefined) syncData.width = updatedFields.width
    if (updatedFields.height !== undefined) syncData.height = updatedFields.height
    if (updatedFields.lengthWithPackage !== undefined) syncData.lengthWithPackage = updatedFields.lengthWithPackage
    if (updatedFields.widthWithPackage !== undefined) syncData.widthWithPackage = updatedFields.widthWithPackage
    if (updatedFields.heightWithPackage !== undefined) syncData.heightWithPackage = updatedFields.heightWithPackage

    console.log(`   📝 Campos a sincronizar: ${Object.keys(syncData).join(', ')}`)

    // Processar cada produto dropado
    for (const droppedProduct of droppedProducts) {
      try {
        const sellerName = droppedProduct.seller?.storeName || 'Vendedor desconhecido'
        const sellerId = droppedProduct.sellerId!

        // Verificar se o preço do vendedor está abaixo do preço base
        const vendorPrice = droppedProduct.price
        const belowBasePrice = vendorPrice < precoBase

        if (belowBasePrice) {
          // Inativar o produto do vendedor
          console.log(`   ⛔ Vendedor ${sellerName}: preço R$ ${vendorPrice.toFixed(2)} < base R$ ${precoBase.toFixed(2)} - INATIVANDO`)
          
          await prisma.product.update({
            where: { id: droppedProduct.id },
            data: {
              ...syncData,
              active: false,
              // Adicionar nota do motivo da inativação
              supplierUrl: droppedProduct.supplierUrl + `?inactivated_reason=price_below_base&base_price=${precoBase}&vendor_price=${vendorPrice}&inactivated_at=${new Date().toISOString()}`
            }
          })

          result.inactivated++
          result.details.push({
            productId: droppedProduct.id,
            sellerId,
            sellerName,
            action: 'inactivated',
            reason: `Preço R$ ${vendorPrice.toFixed(2)} abaixo do mínimo R$ ${precoBase.toFixed(2)}`
          })
        } else {
          // Sincronizar normalmente
          console.log(`   ✅ Vendedor ${sellerName}: preço R$ ${vendorPrice.toFixed(2)} OK - sincronizando`)
          
          await prisma.product.update({
            where: { id: droppedProduct.id },
            data: syncData
          })

          result.synced++
          result.details.push({
            productId: droppedProduct.id,
            sellerId,
            sellerName,
            action: 'synced'
          })
        }
      } catch (err: any) {
        console.error(`   ❌ Erro ao sincronizar produto ${droppedProduct.id}:`, err.message)
        result.errors.push(`Produto ${droppedProduct.id}: ${err.message}`)
        result.details.push({
          productId: droppedProduct.id,
          sellerId: droppedProduct.sellerId!,
          sellerName: droppedProduct.seller?.storeName || 'Desconhecido',
          action: 'error',
          reason: err.message
        })
      }
    }

    console.log('\n📊 RESULTADO DA SINCRONIZAÇÃO:')
    console.log(`   ✅ Sincronizados: ${result.synced}`)
    console.log(`   ⛔ Inativados: ${result.inactivated}`)
    console.log(`   ❌ Erros: ${result.errors.length}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return result
  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error)
    result.errors.push(error.message)
    return result
  }
}

/**
 * Reativa um produto dropshipping quando o vendedor ajusta o preço
 * 
 * @param productId - ID do produto do vendedor
 * @param newPrice - Novo preço que o vendedor quer praticar
 */
export async function checkAndReactivateDropProduct(
  productId: string,
  newPrice: number
): Promise<{ reactivated: boolean; message: string }> {
  try {
    // Buscar o produto
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true }
    })

    if (!product) {
      return { reactivated: false, message: 'Produto não encontrado' }
    }

    if (!product.supplierSku) {
      return { reactivated: false, message: 'Produto não é um drop' }
    }

    // Buscar produto original
    const sourceProduct = await prisma.product.findUnique({
      where: { id: product.supplierSku }
    })

    if (!sourceProduct) {
      return { reactivated: false, message: 'Produto original não encontrado' }
    }

    const precoBase = sourceProduct.price

    // Verificar se o novo preço é válido
    if (newPrice < precoBase) {
      return { 
        reactivated: false, 
        message: `O preço deve ser no mínimo R$ ${precoBase.toFixed(2)}`
      }
    }

    // Se estava inativo por preço baixo, reativar
    if (!product.active && product.supplierUrl?.includes('inactivated_reason=price_below_base')) {
      // Limpar o motivo da inativação da URL
      const cleanUrl = product.supplierUrl.split('?inactivated_reason')[0]
      
      await prisma.product.update({
        where: { id: productId },
        data: {
          active: true,
          price: newPrice,
          supplierUrl: cleanUrl
        }
      })

      console.log(`✅ Produto ${productId} reativado com preço R$ ${newPrice.toFixed(2)}`)
      return { reactivated: true, message: 'Produto reativado com sucesso!' }
    }

    return { reactivated: false, message: 'Produto não estava inativado por preço' }
  } catch (error: any) {
    console.error('Erro ao verificar reativação:', error)
    return { reactivated: false, message: error.message }
  }
}
