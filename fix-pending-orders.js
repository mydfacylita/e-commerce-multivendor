const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Atualizar os pedidos do grupo HYB8001734301
  const result = await p.order.updateMany({
    where: {
      parentOrderId: 'HYB8001734301'
    },
    data: {
      status: 'PROCESSING',
      paymentStatus: 'approved',
      paymentApprovedAt: new Date()
    }
  })

  console.log(`✅ ${result.count} pedidos atualizados para PROCESSING!`)
  
  // Verificar
  const orders = await p.order.findMany({
    where: { parentOrderId: 'HYB8001734301' },
    select: { id: true, status: true, paymentStatus: true }
  })
  
  console.log('\n📦 Pedidos após atualização:')
  orders.forEach(o => console.log(JSON.stringify(o)))
}

main().finally(() => p.$disconnect())
