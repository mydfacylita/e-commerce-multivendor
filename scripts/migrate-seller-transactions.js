const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateSellerTransactions() {
  console.log('=== MIGRAÇÃO DE TRANSAÇÕES PARA CONTA DIGITAL ===\n')

  try {
    // Buscar todos os sellers com conta digital
    const sellers = await prisma.seller.findMany({
      include: {
        account: true
      }
    })

    console.log(`Encontrados ${sellers.length} vendedores\n`)

    for (const seller of sellers) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📦 Vendedor: ${seller.storeName}`)
      console.log(`   ID: ${seller.id}`)
      console.log(`   Balance atual: R$ ${seller.balance?.toFixed(2) || '0.00'}`)
      console.log(`   Conta Digital: ${seller.account ? seller.account.accountNumber : 'NÃO TEM'}`)

      if (!seller.account) {
        console.log('   ⚠️ Vendedor não tem conta digital - pulando')
        continue
      }

      // Buscar pedidos PAGOS que contêm itens deste vendedor
      const orderItems = await prisma.orderItem.findMany({
        where: {
          sellerId: seller.id,
          order: {
            paymentStatus: 'APPROVED',
            status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] }
          }
        },
        include: {
          order: {
            select: {
              id: true,
              paymentApprovedAt: true,
              createdAt: true,
              status: true
            }
          }
        }
      })

      console.log(`   📋 Itens de pedidos pagos: ${orderItems.length}`)

      // Verificar transações já existentes
      const existingTransactions = await prisma.sellerAccountTransaction.findMany({
        where: {
          accountId: seller.account.id,
          type: 'SALE'
        },
        select: { orderId: true }
      })

      const existingOrderIds = new Set(existingTransactions.map(t => t.orderId))
      console.log(`   ✅ Transações SALE já existentes: ${existingOrderIds.size}`)

      // Agrupar itens por pedido
      const orderGroups = new Map()
      for (const item of orderItems) {
        if (!orderGroups.has(item.order.id)) {
          orderGroups.set(item.order.id, {
            order: item.order,
            items: [],
            totalRevenue: 0,
            totalCommission: 0,
            totalBruto: 0
          })
        }
        const group = orderGroups.get(item.order.id)
        group.items.push(item)
        group.totalRevenue += item.sellerRevenue || 0
        group.totalCommission += item.commissionAmount || 0
        group.totalBruto += (item.price * item.quantity) || 0
      }

      console.log(`   📦 Pedidos únicos: ${orderGroups.size}`)

      let created = 0
      let skipped = 0

      for (const [orderId, group] of orderGroups) {
        // Pular se já existe transação para este pedido
        if (existingOrderIds.has(orderId)) {
          skipped++
          continue
        }

        const orderRef = orderId.slice(-8).toUpperCase()
        const transactionDate = group.order.paymentApprovedAt || group.order.createdAt

        console.log(`\n   📝 Criando transações para pedido #${orderRef}`)
        console.log(`      Valor Bruto: R$ ${group.totalBruto.toFixed(2)}`)
        console.log(`      Comissão Plataforma: R$ ${group.totalCommission.toFixed(2)}`)
        console.log(`      Receita Líquida: R$ ${group.totalRevenue.toFixed(2)}`)

        // Buscar saldo atual da conta
        const account = await prisma.sellerAccount.findUnique({
          where: { id: seller.account.id }
        })

        const currentBalance = Number(account.balance) || 0

        // Criar transação de VENDA (valor bruto como crédito)
        if (group.totalBruto > 0) {
          await prisma.sellerAccountTransaction.create({
            data: {
              accountId: seller.account.id,
              type: 'SALE',
              amount: group.totalBruto,
              balanceBefore: currentBalance,
              balanceAfter: currentBalance + group.totalBruto,
              description: `Venda - Pedido #${orderRef}`,
              reference: orderId,
              referenceType: 'ORDER',
              orderId: orderId,
              status: 'COMPLETED',
              createdAt: transactionDate,
              processedAt: transactionDate
            }
          })
          console.log(`      ✅ SALE criada: +R$ ${group.totalBruto.toFixed(2)}`)
        }

        // Criar transação de COMISSÃO (débito da plataforma)
        if (group.totalCommission > 0) {
          const balanceAfterSale = currentBalance + group.totalBruto
          await prisma.sellerAccountTransaction.create({
            data: {
              accountId: seller.account.id,
              type: 'COMMISSION',
              amount: group.totalCommission,
              balanceBefore: balanceAfterSale,
              balanceAfter: balanceAfterSale - group.totalCommission,
              description: `Taxa da plataforma (${group.items[0]?.commissionRate || 12}%) - Pedido #${orderRef}`,
              reference: orderId,
              referenceType: 'ORDER',
              orderId: orderId,
              status: 'COMPLETED',
              createdAt: transactionDate,
              processedAt: transactionDate
            }
          })
          console.log(`      ✅ COMMISSION criada: -R$ ${group.totalCommission.toFixed(2)}`)
        }

        // Atualizar saldo da conta digital
        await prisma.sellerAccount.update({
          where: { id: seller.account.id },
          data: {
            balance: { increment: group.totalRevenue }
          }
        })

        created++
      }

      console.log(`\n   📊 Resumo: ${created} pedidos migrados, ${skipped} já existiam`)
    }

    console.log('\n\n✅ Migração concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateSellerTransactions()
