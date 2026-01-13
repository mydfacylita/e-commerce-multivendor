const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Verificando comissão DROP nos produtos...\n')
  
  const dropProducts = await prisma.product.findMany({
    where: {
      isDropshipping: true
    },
    select: {
      id: true,
      name: true,
      price: true,
      dropshippingCommission: true,
      sellerId: true,
      seller: {
        select: {
          storeName: true,
        }
      }
    }
  })

  console.log(`📦 ${dropProducts.length} produtos DROP encontrados:\n`)
  
  dropProducts.forEach(p => {
    console.log(`\n📦 ${p.name}`)
    console.log(`   Preço: R$ ${p.price.toFixed(2)}`)
    console.log(`   Comissão: ${p.dropshippingCommission || 0}%`)
    console.log(`   Vendedor: ${p.seller?.storeName || 'N/A'}`)
    console.log(`   ID: ${p.id}`)
  })

  console.log(`\n${'='.repeat(80)}`)
  console.log('💡 Se a comissão estiver 0%, atualize no cadastro do produto!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
