const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Atualizando comissão dos produtos DROP clonados...\n')
  
  // Atualizar produtos do MARCIOSTORE para 15% de comissão
  const result = await prisma.product.updateMany({
    where: {
      isDropshipping: true,
      sellerId: { not: null },
      OR: [
        { dropshippingCommission: null },
        { dropshippingCommission: 0 }
      ]
    },
    data: {
      dropshippingCommission: 15
    }
  })

  console.log(`✅ ${result.count} produtos atualizados para 15% de comissão\n`)

  // Verificar resultado
  const products = await prisma.product.findMany({
    where: {
      isDropshipping: true,
      sellerId: { not: null }
    },
    select: {
      name: true,
      price: true,
      dropshippingCommission: true,
      seller: {
        select: {
          storeName: true
        }
      }
    }
  })

  console.log('📦 Produtos DROP de vendedores:\n')
  products.forEach(p => {
    console.log(`   ${p.name} - ${p.seller.storeName}`)
    console.log(`   Preço: R$ ${p.price.toFixed(2)} | Comissão: ${p.dropshippingCommission}%\n`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
