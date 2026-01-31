const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const search = process.argv[2] || 'LAXASFIT'
  
  const products = await prisma.product.findMany({
    where: { name: { contains: search } },
    select: { id: true, name: true, selectedSkus: true }
  })
  
  console.log('Encontrados:', products.length)
  products.forEach(p => {
    console.log('\nID:', p.id)
    console.log('Nome:', p.name?.substring(0, 60))
    console.log('SelectedSkus:', p.selectedSkus ? 'TEM (' + JSON.parse(p.selectedSkus).length + ' skus)' : 'VAZIO')
  })
}

main().finally(() => prisma.$disconnect())
