const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixNegativeRevenue() {
  console.log('=== CORRIGINDO REVENUES NEGATIVOS ===\n')

  // Buscar items com revenue negativo
  const badItems = await prisma.orderItem.findMany({
    where: {
      sellerRevenue: { lt: 0 }
    },
    include: {
      product: true,
      order: {
        select: { id: true, status: true }
      }
    }
  })

  console.log(`Encontrados ${badItems.length} itens com revenue negativo\n`)

  for (const item of badItems) {
    console.log(`\n--- Item: ${item.product?.name} ---`)
    console.log(`Preço: R$ ${item.price} x ${item.quantity}`)
    console.log(`Revenue ERRADO: R$ ${item.sellerRevenue}`)
    console.log(`Pedido Status: ${item.order?.status}`)

    // Para dropshipping, o revenue mínimo é 0 (não pode ter prejuízo)
    // Vamos zerar esses valores incorretos
    const correctedRevenue = 0
    const correctedCommission = 0

    await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        sellerRevenue: correctedRevenue,
        commissionAmount: correctedCommission
      }
    })

    console.log(`✅ Corrigido para: Revenue R$ 0.00, Commission R$ 0.00`)
  }

  console.log('\n\n=== CORREÇÃO CONCLUÍDA ===')
  console.log(`${badItems.length} itens corrigidos`)

  await prisma.$disconnect()
}

fixNegativeRevenue()
