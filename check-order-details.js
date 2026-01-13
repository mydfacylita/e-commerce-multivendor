const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkOrder() {
  try {
    const orderId = 'cmk5s25dk000d8bf2dic21da0' // Pedido da imagem

    console.log('🔍 Verificando pedido:', orderId)
    console.log('')

    // Buscar pedido completo
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    })

    if (!order) {
      console.log('❌ Pedido não encontrado!')
      return
    }

    console.log('📦 PEDIDO:')
    console.log('   ID:', order.id)
    console.log('   Status:', order.status)
    console.log('   Total:', order.total)
    console.log('   Cliente:', order.buyerName)
    console.log('   Data:', order.createdAt)
    console.log('')

    console.log('📋 ITEMS DO PEDIDO:')
    for (const item of order.items) {
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('   Item ID:', item.id)
      console.log('   Product ID:', item.productId)
      console.log('   Seller ID:', item.sellerId || '❌ SEM SELLER!')
      console.log('   Quantidade:', item.quantity)
      console.log('   Preço:', item.price)
      console.log('   Tipo:', item.itemType)
      console.log('')
      
      if (item.product) {
        console.log('   ✅ Produto encontrado:')
        console.log('      Nome:', item.product.name)
        console.log('      Seller ID:', item.product.sellerId || '❌ SEM SELLER!')
      } else {
        console.log('   ❌ PRODUTO NÃO EXISTE MAIS!')
      }
      console.log('')

      // Buscar vendedor separadamente se tiver sellerId
      if (item.sellerId) {
        const seller = await prisma.seller.findUnique({
          where: { id: item.sellerId }
        })
        
        if (seller) {
          console.log('   👤 Vendedor:')
          console.log('      ID:', seller.id)
          console.log('      Loja:', seller.storeName)
        } else {
          console.log('   ❌ VENDEDOR NÃO ENCONTRADO!')
        }
      }
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 VERIFICANDO PROBLEMA:')
    
    const itemsSemVendedor = order.items.filter(i => !i.sellerId)
    const produtosNaoExistem = order.items.filter(i => !i.product)
    
    if (itemsSemVendedor.length > 0) {
      console.log(`⚠️  ${itemsSemVendedor.length} items SEM sellerId!`)
    }
    
    if (produtosNaoExistem.length > 0) {
      console.log(`⚠️  ${produtosNaoExistem.length} produtos NÃO EXISTEM MAIS!`)
    }

    if (itemsSemVendedor.length === 0 && produtosNaoExistem.length === 0) {
      console.log('✅ Todos os items têm vendedor e produto existe')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkOrder()
