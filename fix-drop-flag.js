const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixDropProducts() {
  try {
    console.log('🔧 Corrigindo produtos DROP...\n')

    // Corrigir produtos que têm supplierSku mas isDropshipping = false
    const result = await prisma.product.updateMany({
      where: {
        AND: [
          { supplierSku: { not: null } },
          { isDropshipping: false }
        ]
      },
      data: {
        isDropshipping: true
      }
    })

    console.log(`✅ ${result.count} produtos corrigidos para isDropshipping = true`)
    console.log('')

    // Verificar produtos da MARCIOSTORE
    const seller = await prisma.seller.findFirst({
      where: { storeName: 'MARCIOSTORE' }
    })

    const products = await prisma.product.findMany({
      where: { sellerId: seller.id },
      select: {
        name: true,
        isDropshipping: true,
        supplierSku: true
      }
    })

    console.log('📊 Produtos MARCIOSTORE após correção:\n')
    products.forEach(p => {
      const tipo = p.isDropshipping ? '📦 DROP' : '🏪 ESTOQUE'
      const supplier = p.supplierSku ? `(SKU: ${p.supplierSku.slice(0, 12)}...)` : ''
      console.log(`   ${tipo} ${p.name} ${supplier}`)
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDropProducts()
