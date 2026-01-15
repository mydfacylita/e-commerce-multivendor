const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      status: true,
      separatedAt: true,
      packedAt: true,
      shippedAt: true,
      createdAt: true,
      buyerName: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  console.log('\n📦 Últimos 20 pedidos:\n')
  console.log('ID       | STATUS      | SEPARADO | EMBALADO | ENVIADO | CLIENTE')
  console.log('-'.repeat(80))
  
  orders.forEach(o => {
    console.log(
      o.id.slice(-8).padEnd(8),
      '|',
      (o.status || '-').padEnd(11),
      '|',
      (o.separatedAt ? '✅' : '⏳').padEnd(8),
      '|',
      (o.packedAt ? '✅' : '⏳').padEnd(8),
      '|',
      (o.shippedAt ? '✅' : '⏳').padEnd(7),
      '|',
      (o.buyerName || '-').substring(0, 20)
    )
  })

  // Contar por status
  const counts = await prisma.order.groupBy({
    by: ['status'],
    _count: true
  })

  console.log('\n📊 Contagem por status:')
  counts.forEach(c => {
    console.log(`   ${c.status}: ${c._count}`)
  })

  // Pedidos PROCESSING sem separatedAt (que deveriam aparecer na expedição)
  const pendingExpedition = await prisma.order.count({
    where: {
      status: 'PROCESSING',
      separatedAt: null
    }
  })

  console.log(`\n🚚 Pedidos para expedição (PROCESSING + não separados): ${pendingExpedition}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
