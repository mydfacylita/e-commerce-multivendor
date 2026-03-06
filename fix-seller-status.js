const { PrismaClient } = require('/var/www/mydshop/node_modules/@prisma/client')
const p = new PrismaClient()
async function run() {
  // Desativar produtos de vendedores com assinatura expirada (sem plano ativo)
  const sellers = await p.seller.findMany({
    where: {
      subscriptions: { some: { status: 'EXPIRED' } },
      NOT: { subscriptions: { some: { status: { in: ['ACTIVE', 'TRIAL'] } } } }
    },
    select: { id: true, storeName: true, status: true }
  })
  console.log('Vendedores com assinatura expirada e sem plano ativo:', sellers.length)

  for (const s of sellers) {
    const activeCount = await p.product.count({ where: { sellerId: s.id, active: true } })
    console.log(` - ${s.storeName} | seller: ${s.status} | produtos ativos: ${activeCount}`)
    if (activeCount > 0) {
      const r = await p.product.updateMany({ where: { sellerId: s.id, active: true }, data: { active: false } })
      console.log(`   -> Desativados ${r.count} produtos`)
    } else {
      console.log(`   -> Produtos ja desativados OK`)
    }
  }
}
run().catch(console.error).finally(() => p.$disconnect())
