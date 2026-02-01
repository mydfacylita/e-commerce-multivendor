const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  console.log('=== VERIFICANDO PEDIDOS ===\n')
  
  // Buscar todos os pedidos PROCESSING
  const processingOrders = await prisma.order.findMany({
    where: { status: 'PROCESSING' },
    select: {
      id: true,
      buyerName: true,
      status: true,
      shippingMethod: true,
      shippingCarrier: true,
      separatedAt: true,
      packedAt: true,
      shippedAt: true
    },
    take: 20
  })
  
  console.log('Pedidos PROCESSING:', processingOrders.length)
  processingOrders.forEach(o => {
    console.log(`  ${o.id} - ${o.buyerName}`)
    console.log(`    Carrier: ${o.shippingCarrier || 'N/A'}, Method: ${o.shippingMethod || 'N/A'}`)
    console.log(`    separatedAt: ${o.separatedAt}, packedAt: ${o.packedAt}, shippedAt: ${o.shippedAt}`)
  })
  
  console.log('\n=== FILTRO EXPEDIÇÃO (pending) ===')
  
  // Simular o filtro da API de expedição
  const expeditionOrders = await prisma.order.findMany({
    where: {
      status: 'PROCESSING',
      separatedAt: null,
      NOT: {
        OR: [
          { shippingCarrier: { contains: 'CAINIAO' } },
          { shippingCarrier: { contains: 'ALIEXPRESS' } },
          { shippingMethod: { contains: 'ALIEXPRESS' } },
          { shippingMethod: { contains: 'CAINIAO' } }
        ]
      }
    },
    select: {
      id: true,
      buyerName: true,
      status: true,
      shippingMethod: true,
      shippingCarrier: true
    }
  })
  
  console.log('Resultado filtro expedição:', expeditionOrders.length)
  expeditionOrders.forEach(o => {
    console.log(`  ${o.id} - ${o.buyerName} - Carrier: ${o.shippingCarrier || 'N/A'}`)
  })
  
  await prisma.$disconnect()
}

run().catch(console.error)
