import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Atualizando números de pedidos existentes...\n')
  
  // Buscar todos os pedidos ordenados por data de criação
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, orderNumber: true, createdAt: true }
  })

  console.log(`📦 Total de pedidos: ${orders.length}\n`)

  let updated = 0

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const newNumber = i + 1

    if (order.orderNumber !== newNumber) {
      await prisma.order.update({
        where: { id: order.id },
        data: { orderNumber: newNumber }
      })

      console.log(`✅ Pedido ${order.id} → #${String(newNumber).padStart(6, '0')}`)
      updated++
    }
  }

  console.log(`\n✅ ${updated} pedidos atualizados!`)
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
