const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  const transactions = await prisma.sellerAccountTransaction.findMany({
    where: {
      account: {
        seller: {
          storeName: 'MARCIOSTORE'
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 15
  })

  console.log('\n=== TRANSAÇÕES MARCIOSTORE ===\n')
  transactions.forEach(tx => {
    const sign = tx.type === 'COMMISSION' ? '-' : '+'
    console.log(`${tx.type.padEnd(12)} ${sign} R$ ${tx.amount.toFixed(2).padStart(8)} | ${tx.description}`)
  })

  // Saldo da conta
  const account = await prisma.sellerAccount.findFirst({
    where: { seller: { storeName: 'MARCIOSTORE' } }
  })
  console.log(`\nSaldo atual da conta: R$ ${account?.balance?.toFixed(2) || '0.00'}`)

  await prisma.$disconnect()
}

check()
