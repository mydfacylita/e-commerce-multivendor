const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProductDetails() {
  try {
    const seller = await prisma.seller.findFirst({
      where: { storeName: 'MARCIOSTORE' }
    })

    const products = await prisma.product.findMany({
      where: {
        sellerId: seller.id
      },
      select: {
        id: true,
        name: true,
        isDropshipping: true,
        sellerId: true,
        supplierId: true,
        supplierSku: true,
        supplierUrl: true,
        availableForDropship: true
      }
    })

    console.log('🏪 MARCIOSTORE - Produtos:\n')

    for (const p of products) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📦 Produto:', p.name)
      console.log('   ID:', p.id)
      console.log('   isDropshipping:', p.isDropshipping ? '✅ SIM' : '❌ NÃO')
      console.log('   sellerId:', p.sellerId ? 'MARCIOSTORE' : 'PLATAFORMA')
      console.log('   supplierId:', p.supplierId || 'N/A')
      console.log('   supplierSku:', p.supplierSku || 'N/A')
      console.log('   supplierUrl:', p.supplierUrl ? 'Sim' : 'Não')
      console.log('')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductDetails()
