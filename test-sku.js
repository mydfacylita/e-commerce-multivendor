const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const id = process.argv[2]
  
  if (!id) {
    console.log('Uso: node test-sku.js <product-id>')
    return
  }
  
  console.log('Buscando produto:', id)
  
  const product = await prisma.product.findUnique({
    where: { id }
  })
  
  if (!product) {
    console.log('Produto NAO encontrado!')
    return
  }
  
  console.log('Produto:', product.name)
  console.log('SelectedSkus:', product.selectedSkus ? 'TEM' : 'VAZIO')
  
  if (product.selectedSkus) {
    const parsed = JSON.parse(product.selectedSkus)
    console.log('Total SKUs:', parsed.length)
    parsed.forEach(s => {
      console.log(`  - ${s.skuId}: enabled=${s.enabled}, price=${s.customPrice}`)
    })
  }
}

main().finally(() => prisma.$disconnect())
