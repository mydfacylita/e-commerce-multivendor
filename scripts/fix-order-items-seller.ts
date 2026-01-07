import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Corrigindo sellerId nos OrderItems...')

  // Buscar todos os OrderItems sem sellerId
  const items = await prisma.orderItem.findMany({
    where: {
      sellerId: null
    },
    include: {
      product: true
    }
  })

  console.log(`📦 Encontrados ${items.length} itens sem sellerId`)

  let fixed = 0
  for (const item of items) {
    if (item.product.sellerId) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { sellerId: item.product.sellerId }
      })
      fixed++
      console.log(`✅ Item ${item.id} - Produto: ${item.product.name} - Seller: ${item.product.sellerId}`)
    }
  }

  console.log(`\n✅ ${fixed} itens corrigidos!`)
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
