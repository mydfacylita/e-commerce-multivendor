const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

p.order.findMany({
  where: { status: 'PROCESSING' },
  select: { id: true, status: true, separatedAt: true, buyerName: true }
}).then(r => {
  console.log('Pedidos PROCESSING:')
  r.forEach(o => console.log(o))
}).finally(() => p.$disconnect())
