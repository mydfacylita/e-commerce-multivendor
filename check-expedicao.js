const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkExpedicao() {
  console.log('\n=== VERIFICANDO PEDIDOS PARA EXPEDIÇÃO ===\n')
  
  // Verificar todos os pedidos PROCESSING, SHIPPED, DELIVERED
  const allProcessing = await prisma.order.findMany({
    where: { status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] } },
    select: {
      id: true,
      status: true,
      shippingMethod: true,
      shippingCarrier: true,
      shippingService: true,
      separatedAt: true,
      packedAt: true,
      shippedAt: true,
      buyerName: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
  
  console.log('Pedidos PROCESSING total:', allProcessing.length)
  allProcessing.forEach(o => {
    console.log(`  - ${o.id.slice(0,8)} | ${o.buyerName} | Method: ${o.shippingMethod || 'null'} | Carrier: ${o.shippingCarrier || 'null'} | Separated: ${o.separatedAt ? 'sim' : 'não'}`)
  })
  
  // Verificar quantos são excluídos pelo filtro
  const excluded = allProcessing.filter(o => 
    o.shippingMethod === 'international' || o.shippingCarrier === 'Importação Direta'
  )
  console.log('\nExcluídos pelo filtro (international/Importação Direta):', excluded.length)
  excluded.forEach(o => {
    console.log(`  - ${o.id.slice(0,8)} | ${o.shippingMethod} | ${o.shippingCarrier}`)
  })
  
  // Verificar pedidos próprios (shippingMethod não é international)
  const proprios = allProcessing.filter(o => 
    o.shippingMethod !== 'international' && o.shippingCarrier !== 'Importação Direta'
  )
  console.log('\nPedidos próprios (não excluídos):', proprios.length)
  proprios.forEach(o => {
    console.log(`  - ${o.id.slice(0,8)} | ${o.buyerName} | Method: ${o.shippingMethod || 'null'} | Carrier: ${o.shippingCarrier || 'null'}`)
  })
  
  // Simular o filtro da API
  const apiFilter = await prisma.order.findMany({
    where: {
      status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
      NOT: {
        OR: [
          { shippingMethod: 'international' },
          { shippingCarrier: 'Importação Direta' }
        ]
      },
      separatedAt: null
    },
    select: {
      id: true,
      status: true,
      shippingMethod: true,
      shippingCarrier: true,
      buyerName: true
    },
    take: 20
  })
  
  console.log('\n=== RESULTADO DO FILTRO DA API (pendentes) ===')
  console.log('Total:', apiFilter.length)
  apiFilter.forEach(o => {
    console.log(`  - ${o.id.slice(0,8)} | ${o.buyerName} | Method: ${o.shippingMethod || 'null'}`)
  })
  
  await prisma.$disconnect()
}

checkExpedicao().catch(console.error)
