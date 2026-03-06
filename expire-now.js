const { PrismaClient } = require('/var/www/mydshop/node_modules/@prisma/client')
const p = new PrismaClient()

async function run() {
  const now = new Date()
  console.log('Agora:', now.toISOString())

  // Buscar assinaturas vencidas
  const expired = await p.subscription.findMany({
    where: { status: { in: ['ACTIVE', 'TRIAL'] }, endDate: { lt: now } },
    select: { id: true, sellerId: true, endDate: true, seller: { select: { storeName: true } } }
  })

  console.log('Assinaturas vencidas encontradas:', expired.length)
  expired.forEach(s => console.log(' -', s.seller.storeName, 'venceu em', new Date(s.endDate).toLocaleDateString('pt-BR')))

  if (expired.length === 0) {
    console.log('Nenhuma para expirar.')
    return
  }

  // Expirar assinaturas
  const r1 = await p.subscription.updateMany({
    where: { id: { in: expired.map(s => s.id) } },
    data: { status: 'EXPIRED' }
  })
  console.log('Assinaturas expiradas:', r1.count)

  // Suspender lojas
  const r2 = await p.seller.updateMany({
    where: { id: { in: expired.map(s => s.sellerId) } },
    data: { status: 'SUSPENDED' }
  })
  console.log('Lojas suspensas:', r2.count)
}

run().catch(console.error).finally(() => p.$disconnect())
