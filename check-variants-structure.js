const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProductFields() {
  try {
    console.log('🔍 Buscando produtos com variações...\n')
    
    // Buscar produtos onde variants não é null ou vazio
    const rawProducts = await prisma.$queryRaw`
      SELECT id, name, color, variants, attributes, sizes
      FROM product
      WHERE (
        (variants IS NOT NULL AND variants != '' AND variants != 'null' AND variants != '[]') OR
        (sizes IS NOT NULL AND sizes != '' AND sizes != 'null' AND sizes != '[]')
      )
      LIMIT 5
    `

    console.log(`Encontrados: ${rawProducts.length} produtos\n`)

    for (const product of rawProducts) {
      console.log(`${'='.repeat(80)}`)
      console.log(`📦 ${product.name}`)
      console.log(`ID: ${product.id}`)
      console.log(`Color field: ${product.color || '❌ vazio'}`)
      
      if (product.variants) {
        console.log(`\n🎨 VARIANTS (raw):`)
        console.log(product.variants)
        try {
          const variants = JSON.parse(product.variants)
          console.log(`\n🎨 VARIANTS (parsed):`)
          console.log(JSON.stringify(variants, null, 2))
        } catch (e) {
          console.log(`❌ Erro parse: ${e.message}`)
        }
      }
      
      if (product.attributes) {
        console.log(`\n🏷️  ATTRIBUTES (raw):`)
        console.log(product.attributes.substring(0, 200))
        try {
          const attributes = JSON.parse(product.attributes)
          console.log(`\n🏷️  ATTRIBUTES (parsed):`)
          console.log(JSON.stringify(attributes, null, 2))
        } catch (e) {
          console.log(`❌ Erro parse: ${e.message}`)
        }
      }
      
      if (product.sizes) {
        console.log(`\n📏 SIZES (raw):`)
        console.log(product.sizes)
        try {
          const sizes = JSON.parse(product.sizes)
          console.log(`\n📏 SIZES (parsed):`)
          console.log(JSON.stringify(sizes, null, 2))
        } catch (e) {
          console.log(`❌ Erro parse: ${e.message}`)
        }
      }
      
      console.log(`\n`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductFields()
