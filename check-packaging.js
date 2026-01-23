const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function test() {
  try {
    // Tentar buscar com relação
    const order = await p.order.findFirst({ 
      where: { packagingBoxId: { not: null } },
      select: { id: true, packagingBoxId: true }
    })
    console.log('Order com packagingBoxId:', order)
    
    if (order?.packagingBoxId) {
      const box = await p.packagingBox.findUnique({
        where: { id: order.packagingBoxId }
      })
      console.log('PackagingBox:', box)
    }
  } catch (e) {
    console.log('Error:', e.message)
  } finally {
    await p.$disconnect()
  }
}

test()
