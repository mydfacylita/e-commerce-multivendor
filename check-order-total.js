const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const orders = await prisma.order.findMany({
    where: { status: 'PROCESSING' },
    select: { 
      id: true, 
      total: true,
      buyerName: true
    }
  })
  
  console.log('Orders com total:')
  orders.forEach(o => {
    console.log(`- ${o.id.slice(-8)}: R$ ${o.total} - ${o.buyerName}`)
  })
  
  await prisma.$disconnect()
}

main()
