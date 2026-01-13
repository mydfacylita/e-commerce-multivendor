const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Buscar pedido
  const order = await p.order.findUnique({
    where: { id: 'cmk7il13t00034jvx9a38zpbo' }
  })
  
  console.log('📦 PEDIDO:')
  console.log('  ID:', order.id)
  console.log('  parentOrderId:', order.parentOrderId)
  console.log('  status:', order.status)
  console.log('  paymentId:', order.paymentId)
  console.log('  paymentStatus:', order.paymentStatus)
  
  // Se tem parentOrderId, buscar todos relacionados
  if (order.parentOrderId) {
    const related = await p.order.findMany({
      where: {
        OR: [
          { id: order.parentOrderId },
          { parentOrderId: order.parentOrderId }
        ]
      },
      select: { id: true, status: true, paymentId: true, parentOrderId: true }
    })
    console.log('\n📦 PEDIDOS RELACIONADOS:')
    related.forEach(o => console.log(JSON.stringify(o)))
  }
}

main().finally(() => p.$disconnect())
