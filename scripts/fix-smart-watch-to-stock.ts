import { prisma } from '../lib/prisma'

async function fixProduct() {
  console.log('🔧 CORRIGINDO PRODUTO: Smart Watch Series 7')
  console.log('='.repeat(80))
  
  const productId = 'cmk4d6tla000o9o4rcu8h5147'
  
  // Atualizar produto para NÃO ser dropshipping
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      isDropshipping: false
    }
  })
  
  console.log('✅ Produto atualizado!')
  console.log('isDropshipping:', updated.isDropshipping ? 'SIM' : 'NÃO')
  
  console.log('\n🔧 CORRIGINDO ORDERITEMS ANTERIORES...')
  
  // Atualizar OrderItems desse produto para STOCK
  const result = await prisma.orderItem.updateMany({
    where: {
      productId: productId
    },
    data: {
      itemType: 'STOCK',
      supplierCost: 0 // Zerar custo de fornecedor pois é estoque
    }
  })
  
  console.log(`✅ ${result.count} OrderItems atualizados para STOCK`)
  
  console.log('\n='.repeat(80))
  console.log('✅ Correção concluída!')
}

fixProduct()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
