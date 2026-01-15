const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  const correios = await p.systemConfig.findFirst({ where: { key: 'correios.enabled' } })
  console.log('correios.enabled:', correios)
  
  const cepOrigem = await p.systemConfig.findFirst({ where: { key: 'correios.cepOrigem' } })
  console.log('correios.cepOrigem:', cepOrigem)
  
  // Verifica produto
  const product = await p.product.findUnique({ 
    where: { id: 'cmk4d6tko000g9o4rs0x2t1qz' },
    select: { id: true, name: true, weight: true, length: true, width: true, height: true }
  })
  console.log('Produto:', product)
  
  await p.$disconnect()
}

check()
