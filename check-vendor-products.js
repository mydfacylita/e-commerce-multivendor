const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProducts() {
  try {
    const seller = await prisma.seller.findFirst({
      where: { storeName: 'MARCIOSTORE' }
    })

    if (!seller) {
      console.log('❌ Vendedor não encontrado')
      return
    }

    console.log('🏪 Vendedor:', seller.storeName)
    console.log('')

    const products = await prisma.product.findMany({
      where: {
        sellerId: seller.id
      },
      select: {
        id: true,
        name: true,
        isDropshipping: true,
        price: true
      }
    })

    console.log(`📦 ${products.length} produtos cadastrados:\n`)

    const dropProducts = products.filter(p => p.isDropshipping)
    const stockProducts = products.filter(p => !p.isDropshipping)

    console.log(`📦 DROPSHIPPING: ${dropProducts.length}`)
    dropProducts.forEach(p => {
      console.log(`   - ${p.name} (R$ ${p.price})`)
    })

    console.log('')
    console.log(`🏪 ESTOQUE LOCAL: ${stockProducts.length}`)
    stockProducts.forEach(p => {
      console.log(`   - ${p.name} (R$ ${p.price})`)
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProducts()
