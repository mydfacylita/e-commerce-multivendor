const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPayment() {
  try {
    // Buscar pedido com paymentId
    const orders = await prisma.order.findMany({
      where: {
        paymentId: '141204835698'
      },
      select: {
        id: true,
        status: true,
        paymentId: true,
        paymentStatus: true,
        paymentType: true,
        total: true,
        createdAt: true
      }
    })

    console.log('=== PEDIDOS COM PAYMENTID 141204835698 ===')
    console.log(JSON.stringify(orders, null, 2))
    console.log('')

    // Buscar pedidos PENDING recentes
    const pending = await prisma.order.findMany({
      where: {
        status: 'PENDING'
      },
      select: {
        id: true,
        status: true,
        paymentId: true,
        paymentStatus: true,
        total: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    console.log('=== ÚLTIMOS 5 PEDIDOS PENDING ===')
    console.log(JSON.stringify(pending, null, 2))

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPayment()
