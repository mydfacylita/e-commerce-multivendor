const { PrismaClient } = require('@prisma/client')

/**
 * Script para sincronizar dados fiscais de produtos originais para clones de dropshipping
 */
async function syncAllDropProducts() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Buscando produtos originais de dropshipping...')
    
    // Buscar todos os produtos originais do admin que são dropshipping
    const originais = await prisma.product.findMany({
      where: {
        sellerId: null,
        isDropshipping: true
      },
      select: {
        id: true,
        name: true,
        gtin: true,
        ncm: true,
        cest: true,
        origem: true,
        cfopInterno: true,
        cfopInterestadual: true,
        unidadeComercial: true,
        unidadeTributavel: true
      }
    })
    
    console.log(`📦 Encontrados ${originais.length} produtos originais`)
    
    let totalSynced = 0
    
    for (const original of originais) {
      // Buscar clones deste produto
      const clones = await prisma.product.findMany({
        where: { supplierSku: original.id }
      })
      
      if (clones.length === 0) continue
      
      console.log(`\n📋 ${original.name.substring(0, 40)}...`)
      console.log(`   Original GTIN: ${original.gtin || 'VAZIO'}`)
      console.log(`   Clones: ${clones.length}`)
      
      // Atualizar todos os clones com dados fiscais do original
      const result = await prisma.product.updateMany({
        where: { supplierSku: original.id },
        data: {
          gtin: original.gtin,
          ncm: original.ncm,
          cest: original.cest,
          origem: original.origem,
          cfopInterno: original.cfopInterno,
          cfopInterestadual: original.cfopInterestadual,
          unidadeComercial: original.unidadeComercial,
          unidadeTributavel: original.unidadeTributavel,
          lastSyncAt: new Date()
        }
      })
      
      console.log(`   ✅ Atualizados: ${result.count}`)
      totalSynced += result.count
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`✅ Total sincronizados: ${totalSynced}`)
    
  } catch (e) {
    console.error('❌ Erro:', e)
  } finally {
    await prisma.$disconnect()
  }
}

syncAllDropProducts()
