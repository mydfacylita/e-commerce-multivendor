const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSellerProducts() {
  try {
    // Verificar campo approvalStatus
    const testProduct = await prisma.product.findFirst({
      select: { 
        id: true,
        name: true, 
        approvalStatus: true,
        approvalNote: true
      }
    })
    console.log('\n=== TESTE CAMPO approvalStatus ===')
    console.log('Produto encontrado:', testProduct)

    // Testar busca exata como a API faz
    const userId = 'cmk4h7o8l0007cxgj8guv496w'
    const sellerByUserId = await prisma.seller.findUnique({
      where: { userId }
    })
    console.log('\n=== SELLER BY userId ===')
    console.log('userId buscado:', userId)
    console.log('Seller encontrado:', sellerByUserId)
    
    if (sellerByUserId) {
      const productsForThisSeller = await prisma.product.findMany({
        where: { sellerId: sellerByUserId.id }
      })
      console.log('Products com este sellerId:', productsForThisSeller.length)
    }
    
    // Buscar todos os sellers
    const sellers = await prisma.seller.findMany({
      select: { 
        id: true, 
        storeName: true, 
        userId: true, 
        status: true 
      }
    })
    console.log('\n=== SELLERS ===')
    console.log(JSON.stringify(sellers, null, 2))

    // Buscar users com role SELLER
    const users = await prisma.user.findMany({
      where: { role: 'SELLER' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true 
      }
    })
    console.log('\n=== USERS COM ROLE SELLER ===')
    console.log(JSON.stringify(users, null, 2))

    // Buscar produtos por seller
    for (const seller of sellers) {
      const products = await prisma.product.findMany({
        where: { sellerId: seller.id },
        select: {
          id: true,
          name: true,
          sellerId: true,
          isDropshipping: true,
          active: true
        }
      })
      console.log(`\n=== PRODUTOS DO SELLER: ${seller.storeName} (ID: ${seller.id}) ===`)
      console.log(`Total: ${products.length}`)
      if (products.length > 0) {
        console.log(JSON.stringify(products.slice(0, 5), null, 2))
      }
    }

    // Buscar produtos com sellerId NULL
    const productsNoSeller = await prisma.product.count({
      where: { sellerId: null }
    })
    console.log(`\n=== PRODUTOS SEM SELLER (sellerId = null) ===`)
    console.log(`Total: ${productsNoSeller}`)

    // Amostra de produtos sem seller
    const sampleNoSeller = await prisma.product.findMany({
      where: { sellerId: null },
      take: 5,
      select: {
        id: true,
        name: true,
        sellerId: true,
        isDropshipping: true
      }
    })
    console.log('Amostra:', JSON.stringify(sampleNoSeller, null, 2))

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSellerProducts()
