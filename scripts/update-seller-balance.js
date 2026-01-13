const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateSellerBalance() {
  try {
    // Buscar todos os vendedores
    const sellers = await prisma.seller.findMany({
      include: {
        _count: {
          select: {
            withdrawals: {
              where: {
                status: { in: ['APPROVED', 'PROCESSING', 'COMPLETED'] }
              }
            }
          }
        }
      }
    })

    for (const seller of sellers) {
      // Calcular total de comissões dos itens
      const orderItems = await prisma.orderItem.findMany({
        where: {
          sellerId: seller.id,
          order: {
            paymentStatus: 'APPROVED'
          }
        }
      })

      const totalEarned = orderItems.reduce((sum, item) => {
        return sum + (item.sellerRevenue || 0)
      }, 0)

      // Calcular total já sacado
      const withdrawals = await prisma.withdrawal.findMany({
        where: {
          sellerId: seller.id,
          status: 'COMPLETED'
        }
      })

      const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0)

      // Calcular saques em andamento (aprovados mas não concluídos)
      const pendingWithdrawals = await prisma.withdrawal.findMany({
        where: {
          sellerId: seller.id,
          status: { in: ['APPROVED', 'PROCESSING'] }
        }
      })

      const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0)

      // Balance = total ganho - total sacado - total em andamento
      const balance = totalEarned - totalWithdrawn - totalPending

      console.log(`\nVendedor: ${seller.storeName}`)
      console.log(`Total Ganho: R$ ${totalEarned.toFixed(2)}`)
      console.log(`Total Sacado: R$ ${totalWithdrawn.toFixed(2)}`)
      console.log(`Em Andamento: R$ ${totalPending.toFixed(2)}`)
      console.log(`Balance Calculado: R$ ${balance.toFixed(2)}`)

      // Atualizar no banco
      await prisma.seller.update({
        where: { id: seller.id },
        data: {
          balance: Math.max(0, balance),
          totalEarned,
          totalWithdrawn
        }
      })

      console.log(`✅ Atualizado!`)
    }

    console.log('\n✅ Todos os vendedores atualizados!')
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateSellerBalance()
