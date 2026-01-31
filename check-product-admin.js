const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const productId = 'cmkwrlvzd0001l7lfjbkg2x7o'
  
  const prod = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      variants: true,
      supplier: { select: { name: true } }
    }
  })
  
  console.log('========================================')
  console.log('Produto:', prod?.name?.substring(0, 60))
  console.log('Fornecedor:', prod?.supplier?.name)
  console.log('ID:', productId)
  console.log('========================================')
  
  if (prod?.variants) {
    try {
      const v = JSON.parse(prod.variants)
      console.log('\n📦 Estrutura de Variantes:')
      console.log('Versão:', v.version)
      console.log('Source:', v.source)
      
      console.log('\n🔧 Propriedades disponíveis:')
      v.properties?.forEach((prop, i) => {
        console.log(`\n  [${i + 1}] ${prop.name} (tipo: ${prop.type})`)
        console.log(`      Opções (${prop.options?.length}):`)
        prop.options?.forEach(opt => {
          console.log(`        - ${opt.value || opt.label} (ID: ${opt.id})`)
        })
      })
      
      console.log('\n📊 SKUs:', v.skus?.length, 'combinações')
      console.log('\nPrimeiros 5 SKUs:')
      v.skus?.slice(0, 5).forEach((sku, i) => {
        const props = sku.properties?.map(p => p.optionValue || p.optionLabel).join(' / ')
        console.log(`  [${i + 1}] ${props}`)
        console.log(`      Stock: ${sku.stock}, Price: R$ ${sku.price}, SKU ID: ${sku.skuId}`)
      })
      
    } catch (e) {
      console.log('❌ Erro ao parsear variants:', e.message)
    }
  } else {
    console.log('\n⚠️ Produto SEM variantes importadas!')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
