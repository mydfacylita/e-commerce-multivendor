const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const orders = await p.order.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      paymentId: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true
    }
  })

  console.log('📦 Pedidos PENDING:')
  orders.forEach(o => {
    console.log(`  ID: ${o.id}`)
    console.log(`  PaymentId: ${o.paymentId || 'NÃO SALVO'}`)
    console.log(`  Status: ${o.status}`)
    console.log(`  PaymentStatus: ${o.paymentStatus || 'N/A'}`)
    console.log(`  Total: R$ ${o.total}`)
    console.log(`  Criado: ${o.createdAt}`)
    console.log('---')
  })
}

main().finally(() => p.$disconnect())
