const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixProductImages() {
  console.log('🔧 Corrigindo campo images dos produtos...')
  
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      images: true
    }
  })

  let fixed = 0
  let alreadyOk = 0

  for (const product of products) {
    let needsFix = false
    let newImages = []

    try {
      // Tentar fazer parse do images
      if (typeof product.images === 'string') {
        // Se for apenas "[" ou string inválida
        if (product.images === '[' || product.images === '[]' || product.images === '') {
          needsFix = true
          newImages = ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400']
        } else {
          // Tentar parse
          try {
            const parsed = JSON.parse(product.images)
            if (Array.isArray(parsed) && parsed.length > 0) {
              alreadyOk++
            } else {
              needsFix = true
              newImages = ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400']
            }
          } catch {
            needsFix = true
            newImages = ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400']
          }
        }
      } else if (Array.isArray(product.images)) {
        if (product.images.length === 0) {
          needsFix = true
          newImages = ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400']
        } else {
          alreadyOk++
        }
      } else {
        needsFix = true
        newImages = ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400']
      }

      if (needsFix) {
        await prisma.product.update({
          where: { id: product.id },
          data: { images: JSON.stringify(newImages) }
        })
        console.log(`✅ Corrigido: ${product.name}`)
        fixed++
      }
    } catch (error) {
      console.error(`❌ Erro ao corrigir ${product.name}:`, error.message)
    }
  }

  console.log(`\n📊 Resumo:`)
  console.log(`✅ Produtos corrigidos: ${fixed}`)
  console.log(`✓  Produtos já corretos: ${alreadyOk}`)
  console.log(`📦 Total: ${products.length}`)
}

fixProductImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
