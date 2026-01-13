const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixOrderItems() {
  try {
    console.log('🔧 Corrigindo OrderItems de produtos DROP...\n')

    // Buscar todos os OrderItems que têm produtos DROP mas itemType = STOCK
    const itemsToFix = await prisma.orderItem.findMany({
      where: {
        itemType: 'STOCK',
        product: {
          isDropshipping: true
        }
      },
      include: {
        product: {
          select: {
            name: true,
            isDropshipping: true
          }
        },
        order: {
          select: {
            id: true
          }
        }
      }
    })

    console.log(`📦 ${itemsToFix.length} items encontrados com tipo errado:\n`)

    for (const item of itemsToFix) {
      console.log(`   - Item ${item.id.slice(0, 8)}...`)
      console.log(`     Pedido: ${item.orderId.slice(0, 8)}...`)
      console.log(`     Produto: ${item.product.name}`)
      console.log(`     Tipo atual: ${item.itemType} (❌ ERRADO)`)
      console.log('')
    }

    if (itemsToFix.length > 0) {
      // Corrigir todos os items
      const result = await prisma.orderItem.updateMany({
        where: {
          itemType: 'STOCK',
          product: {
            isDropshipping: true
          }
        },
        data: {
          itemType: 'DROPSHIPPING'
        }
      })

      console.log(`✅ ${result.count} OrderItems corrigidos para itemType = DROPSHIPPING\n`)

      // Verificar resultado
      console.log('📊 Verificando pedidos do MARCIOSTORE após correção:\n')
      
      const seller = await prisma.seller.findFirst({
        where: { storeName: 'MARCIOSTORE' }
      })

      // Pedidos com STOCK apenas
      const stockOrders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              AND: [
                { sellerId: seller.id },
                { itemType: 'STOCK' }
              ]
            }
          }
        },
        include: {
          items: {
            where: {
              sellerId: seller.id
            },
            include: {
              product: true
            }
          }
        }
      })

      console.log(`🏪 Pedidos com ESTOQUE LOCAL: ${stockOrders.length}`)
      stockOrders.forEach(o => {
        console.log(`   - ${o.id.slice(0, 8)}... - ${o.items[0]?.product.name}`)
      })

      console.log('')

      // Pedidos com DROP
      const dropOrders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              AND: [
                { sellerId: seller.id },
                { itemType: 'DROPSHIPPING' }
              ]
            }
          }
        },
        include: {
          items: {
            where: {
              sellerId: seller.id
            },
            include: {
              product: true
            }
          }
        }
      })

      console.log(`📦 Pedidos com DROPSHIPPING: ${dropOrders.length}`)
      dropOrders.forEach(o => {
        console.log(`   - ${o.id.slice(0, 8)}... - ${o.items[0]?.product.name}`)
      })

    } else {
      console.log('✅ Nenhum item precisou ser corrigido!')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixOrderItems()
