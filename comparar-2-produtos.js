const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function comparar() {
  // SKU ERRADO
  const errado = await p.product.findFirst({ 
    where: { supplierSku: '1005008496972052' },
    select: { name: true, variants: true, selectedSkus: true }
  })

  // SKU CORRETO
  const correto = await p.product.findFirst({ 
    where: { supplierSku: '1005006610012850' },
    select: { name: true, variants: true, selectedSkus: true }
  })

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🔴 PRODUTO 1005008496972052')
  console.log('Nome:', errado?.name)
  console.log('')
  
  console.log('--- VARIANTS COMPLETO ---')
  if (errado?.variants) {
    console.log(JSON.stringify(JSON.parse(errado.variants), null, 2))
  }
  
  console.log('')
  console.log('--- SELECTED SKUS COMPLETO ---')
  if (errado?.selectedSkus) {
    console.log(JSON.stringify(JSON.parse(errado.selectedSkus), null, 2))
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🟢 PRODUTO 1005006610012850')
  console.log('Nome:', correto?.name)
  console.log('')
  
  console.log('--- VARIANTS COMPLETO ---')
  if (correto?.variants) {
    console.log(JSON.stringify(JSON.parse(correto.variants), null, 2))
  }
  
  console.log('')
  console.log('--- SELECTED SKUS COMPLETO ---')
  if (correto?.selectedSkus) {
    console.log(JSON.stringify(JSON.parse(correto.selectedSkus), null, 2))
  }

  await p.$disconnect()
}

comparar()
