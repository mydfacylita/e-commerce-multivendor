const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixProducts() {
  try {
    const seller = await prisma.seller.findFirst({
      where: { storeName: 'MARCIOSTORE' }
    })

    console.log('🔧 Corrigindo produtos DROP...\n')

    // Corrigir Tênis Nike Air Max
    const tenis = await prisma.product.updateMany({
      where: {
        sellerId: seller.id,
        name: { contains: 'Tênis Nike' }
      },
      data: {
        isDropshipping: true
      }
    })
    console.log('✅ Tênis Nike Air Max → isDropshipping = true')

    // Corrigir Smart Watch
    const watch = await prisma.product.updateMany({
      where: {
        sellerId: seller.id,
        name: { contains: 'Smart Watch' }
      },
      data: {
        isDropshipping: true
      }
    })
    console.log('✅ Smart Watch Series 7 → isDropshipping = true')

    console.log('\n📊 Produtos atualizados:', tenis.count + watch.count)

    // Verificar resultado
    const products = await prisma.product.findMany({
      where: { sellerId: seller.id },
      select: {
        name: true,
        isDropshipping: true
      }
    })

    console.log('\n📦 Situação atual:')
    products.forEach(p => {
      const tipo = p.isDropshipping ? '📦 DROP' : '🏪 ESTOQUE'
      console.log(`   ${tipo} - ${p.name}`)
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixProducts()
