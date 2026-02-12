const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProductFields() {
  try {
    console.log('🔍 Verificando estrutura dos campos JSON...\n')
    
    // Buscar alguns produtos com variants e attributes
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { variants: { not: null } },
          { attributes: { not: null } },
          { sizes: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        color: true,
        variants: true,
        attributes: true,
        sizes: true
      },
      take: 5
    })

    for (const product of products) {
      console.log(`${'='.repeat(80)}`)
      console.log(`📦 ${product.name}`)
      console.log(`ID: ${product.id}`)
      console.log(`\n📊 DADOS ATUAIS:`)
      console.log(`  color (campo): ${product.color || '❌ vazio'}`)
      
      if (product.variants) {
        console.log(`\n🎨 VARIANTS:`)
        try {
          const variants = JSON.parse(product.variants)
          console.log(JSON.stringify(variants, null, 2))
        } catch (e) {
          console.log(`  ❌ Erro ao parsear: ${e.message}`)
        }
      }
      
      if (product.attributes) {
        console.log(`\n🏷️  ATTRIBUTES:`)
        try {
          const attributes = JSON.parse(product.attributes)
          console.log(JSON.stringify(attributes, null, 2))
        } catch (e) {
          console.log(`  ❌ Erro ao parsear: ${e.message}`)
        }
      }
      
      if (product.sizes) {
        console.log(`\n📏 SIZES:`)
        try {
          const sizes = JSON.parse(product.sizes)
          console.log(JSON.stringify(sizes, null, 2))
        } catch (e) {
          console.log(`  ❌ Erro ao parsear: ${e.message}`)
        }
      }
      
      console.log(``)
    }
    
    console.log(`\n✅ Total encontrado: ${products.length} produtos com JSON\n`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductFields()
