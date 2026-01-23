import { prisma } from '@/lib/prisma'

/**
 * Marca um código EAN como usado por um produto
 */
export async function markEANAsUsed(eanCode: string, productId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!eanCode || !productId) {
      return { success: false, message: 'Código EAN e ID do produto são obrigatórios' }
    }

    // Verificar se o código EAN existe
    const eanRecord = await prisma.eancode.findUnique({
      where: { code: eanCode }
    })

    if (!eanRecord) {
      // EAN não existe na base - não fazer nada (permitir códigos externos)
      return { success: true, message: 'Código EAN externo aceito' }
    }

    if (eanRecord.used && eanRecord.productId !== productId) {
      // EAN já está sendo usado por outro produto
      const existingProduct = await prisma.product.findUnique({
        where: { id: eanRecord.productId! },
        select: { name: true, active: true }
      })

      if (existingProduct && existingProduct.active) {
        return { 
          success: false, 
          message: `Este código EAN já está sendo usado pelo produto: ${existingProduct.name}` 
        }
      }
    }

    // Marcar EAN como usado
    await prisma.eancode.update({
      where: { code: eanCode },
      data: {
        used: true,
        productId: productId,
        usedAt: new Date()
      }
    })

    console.log(`✅ EAN ${eanCode} marcado como usado pelo produto ${productId}`)
    return { success: true, message: 'EAN marcado como usado com sucesso' }

  } catch (error: any) {
    console.error('Erro ao marcar EAN como usado:', error)
    return { success: false, message: 'Erro interno ao processar EAN' }
  }
}

/**
 * Libera um código EAN de um produto (marca como não usado)
 */
export async function releaseEANFromProduct(eanCode: string, productId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!eanCode) {
      return { success: true, message: 'Nenhum EAN para liberar' }
    }

    // Verificar se o código EAN existe na nossa base
    const eanRecord = await prisma.eancode.findUnique({
      where: { code: eanCode }
    })

    if (!eanRecord) {
      // EAN não existe na nossa base - não fazer nada
      return { success: true, message: 'EAN externo - nada para liberar' }
    }

    if (eanRecord.productId === productId) {
      // Liberar EAN
      await prisma.eancode.update({
        where: { code: eanCode },
        data: {
          used: false,
          productId: null,
          usedAt: null
        }
      })

      console.log(`✅ EAN ${eanCode} liberado do produto ${productId}`)
      return { success: true, message: 'EAN liberado com sucesso' }
    }

    return { success: true, message: 'EAN não estava vinculado a este produto' }

  } catch (error: any) {
    console.error('Erro ao liberar EAN:', error)
    return { success: false, message: 'Erro interno ao liberar EAN' }
  }
}

/**
 * Atualiza o vínculo de um EAN quando o código EAN de um produto é alterado
 */
export async function updateEANAssignment(
  oldEANCode: string | null, 
  newEANCode: string | null, 
  productId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Liberar EAN antigo se existir
    if (oldEANCode && oldEANCode !== newEANCode) {
      await releaseEANFromProduct(oldEANCode, productId)
    }

    // Marcar novo EAN como usado se existir
    if (newEANCode && newEANCode !== oldEANCode) {
      const result = await markEANAsUsed(newEANCode, productId)
      if (!result.success) {
        return result
      }
    }

    return { success: true, message: 'EAN atualizado com sucesso' }

  } catch (error: any) {
    console.error('Erro ao atualizar vínculo EAN:', error)
    return { success: false, message: 'Erro interno ao atualizar EAN' }
  }
}