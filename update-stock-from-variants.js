const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Atualizando estoque dos produtos AliExpress com variantes...\n')
  
  const prods = await prisma.product.findMany({
    where: {
      variants: { not: null },
      supplier: { name: { contains: 'AliExpress' } }
    },
    select: {
      id: true,
      name: true,
      stock: true,
      variants: true
    }
  })
  
  console.log(`📦 Encontrados ${prods.length} produtos com variantes\n`)
  
  let updated = 0
  
  for (const prod of prods) {
    try {
      const v = JSON.parse(prod.variants)
      
      if (v.metadata?.totalStock && prod.stock !== v.metadata.totalStock) {
        await prisma.product.update({
          where: { id: prod.id },
          data: { stock: v.metadata.totalStock }
        })
        
        console.log(`✅ ${prod.name?.substring(0, 40)}...`)
        console.log(`   Stock: ${prod.stock} → ${v.metadata.totalStock}`)
        updated++
      }
    } catch (e) {
      // Ignorar erros de parse
    }
  }
  
  console.log(`\n📊 ${updated} produtos atualizados`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
