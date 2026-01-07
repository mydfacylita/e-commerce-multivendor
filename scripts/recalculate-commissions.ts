import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Recalculando comissões dos pedidos...\n')
  
  const sellerId = 'cmk3bd6vb0002w0bioke9h4ps'
  
  // Buscar seller para pegar taxa de comissão
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId }
  })

  if (!seller) {
    console.log('❌ Vendedor não encontrado')
    return
  }

  console.log(`Vendedor: ${seller.storeName}`)
  console.log(`Taxa de Comissão: ${seller.commission}%\n`)

  // Buscar todos os OrderItems do vendedor
  const items = await prisma.orderItem.findMany({
    where: { sellerId },
    include: { product: true }
  })

  console.log(`📦 Total de itens: ${items.length}\n`)

  let fixed = 0

  for (const item of items) {
    const itemTotal = item.price * item.quantity
    const commissionRate = seller.commission
    const commissionAmount = (itemTotal * commissionRate) / 100
    const sellerRevenue = itemTotal - commissionAmount

    // Atualizar item
    await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        commissionRate,
        commissionAmount,
        sellerRevenue
      }
    })

    fixed++
    console.log(`✅ Item atualizado:`)
    console.log(`   Produto: ${item.product.name}`)
    console.log(`   Valor: R$ ${itemTotal.toFixed(2)}`)
    console.log(`   Comissão: R$ ${commissionAmount.toFixed(2)}`)
    console.log(`   Você recebe: R$ ${sellerRevenue.toFixed(2)}`)
    console.log('')
  }

  console.log(`\n✅ ${fixed} itens recalculados!`)
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
