const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando pedidos DROP...\n')
  
  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          itemType: 'DROPSHIPPING'
        }
      }
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  userId: true,
                  storeName: true,
                  cpf: true,
                  cnpj: true,
                  user: {
                    select: {
                      name: true,
                      email: true,
                      phone: true,
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    take: 3
  })

  console.log(`📦 ${orders.length} pedidos com DROP encontrados\n`)

  for (const order of orders) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🛒 PEDIDO: ${order.id.slice(0, 8)}`)
    console.log(`📅 Data: ${order.createdAt.toLocaleString('pt-BR')}`)
    console.log(`💰 Total: R$ ${order.total.toFixed(2)}`)
    console.log(`📍 Status: ${order.status}`)
    
    // Identificar vendedores
    const sellers = {}
    let totalCommission = 0
    
    order.items.forEach(item => {
      if (item.itemType === 'DROPSHIPPING' && item.product.seller) {
        const sellerId = item.product.sellerId
        if (!sellers[sellerId]) {
          sellers[sellerId] = {
            seller: item.product.seller,
            items: [],
            commission: 0
          }
        }
        const commission = item.price * item.quantity * (item.product.dropshippingCommission || 0) / 100
        sellers[sellerId].items.push({
          name: item.product.name,
          qty: item.quantity,
          price: item.price,
          commission
        })
        sellers[sellerId].commission += commission
        totalCommission += commission
      }
    })

    console.log(`\n👥 VENDEDORES (${Object.keys(sellers).length}):`)
    Object.values(sellers).forEach((data, idx) => {
      console.log(`\n  ${idx + 1}. 🏪 ${data.seller.storeName}`)
      console.log(`     👤 ${data.seller.user?.name || 'N/A'}`)
      console.log(`     📧 ${data.seller.user?.email || 'N/A'}`)
      if (data.seller.user?.phone) console.log(`     📱 ${data.seller.user.phone}`)
      if (data.seller.cpf) console.log(`     🆔 CPF: ${data.seller.cpf}`)
      if (data.seller.cnpj) console.log(`     🏢 CNPJ: ${data.seller.cnpj}`)
      console.log(`     💵 Comissão Total: R$ ${data.commission.toFixed(2)}`)
      console.log(`     📦 Produtos:`)
      data.items.forEach(item => {
        console.log(`        - ${item.name} (x${item.qty}) = R$ ${(item.price * item.qty).toFixed(2)} → +R$ ${item.commission.toFixed(2)}`)
      })
    })

    console.log(`\n💰 RESUMO FINANCEIRO:`)
    console.log(`   Total Pedido: R$ ${order.total.toFixed(2)}`)
    console.log(`   Comissões DROP: R$ ${totalCommission.toFixed(2)}`)
    console.log(`   Receita Plataforma: R$ ${(order.total - totalCommission).toFixed(2)}`)
  }

  console.log(`\n${'='.repeat(80)}\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
