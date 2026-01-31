const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const id = process.argv[2]
  
  if (!id) {
    console.log('Uso: node check-variant-skus.js <product-id>')
    return
  }
  
  const product = await prisma.product.findUnique({
    where: { id }
  })
  
  if (!product) {
    console.log('Produto NAO encontrado!')
    return
  }
  
  console.log('Produto:', product.name?.substring(0, 50))
  console.log('')
  
  // Parse variants
  if (product.variants) {
    let variants = product.variants
    while (typeof variants === 'string') {
      variants = JSON.parse(variants)
    }
    
    if (variants.skus) {
      console.log('=== SKUs nas Variants ===')
      variants.skus.forEach(sku => {
        const props = sku.properties.map(p => p.optionValue || p.optionLabel).join(' / ')
        console.log(`SKU ${sku.skuId}: ${props} - Custo: R$ ${sku.price}`)
      })
    }
  }
  
  console.log('')
  
  // Parse selectedSkus
  if (product.selectedSkus) {
    const selected = JSON.parse(product.selectedSkus)
    console.log('=== SelectedSkus (salvos) ===')
    selected.forEach(s => {
      console.log(`SKU ${s.skuId}: enabled=${s.enabled}, venda=R$ ${s.customPrice}`)
    })
  }
}

main().finally(() => prisma.$disconnect())
