const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const id = process.argv[2] || 'cmkwrlvzd0001l7lfjbkg2x7o'
  
  const product = await prisma.product.findUnique({
    where: { id },
    select: { 
      name: true,
      selectedSkus: true 
    }
  })
  
  console.log('Produto:', product?.name)
  console.log('SelectedSkus raw:', product?.selectedSkus || 'VAZIO')
  
  if (product?.selectedSkus) {
    try {
      const parsed = JSON.parse(product.selectedSkus)
      console.log('\nTotal SKUs salvos:', parsed.length)
      console.log('\nExemplo:', JSON.stringify(parsed.slice(0, 2), null, 2))
      
      const enabled = parsed.filter(s => s.enabled)
      const disabled = parsed.filter(s => !s.enabled)
      console.log('\nHabilitados:', enabled.length)
      console.log('Desabilitados:', disabled.length)
    } catch (e) {
      console.log('Erro ao parsear:', e.message)
    }
  }
}

main().finally(() => prisma.$disconnect())
