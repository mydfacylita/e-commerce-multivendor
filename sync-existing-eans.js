const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function syncExistingProducts() {
  console.log('🔗 Sincronizando códigos EAN de produtos existentes...\n')

  try {
    // Buscar produtos com GTIN que existem na tabela eancode mas não estão marcados como usados
    const products = await prisma.product.findMany({
      where: {
        gtin: { not: null },
        active: true
      },
      select: {
        id: true,
        name: true,
        gtin: true
      }
    })

    console.log(`📦 Encontrados ${products.length} produtos com GTIN`)

    let updated = 0
    let notFound = 0
    let alreadyUsed = 0

    for (const product of products) {
      console.log(`\n🔍 Processando: ${product.name}`)
      console.log(`   GTIN: ${product.gtin}`)

      // Verificar se o código EAN existe na tabela
      const eanRecord = await prisma.eancode.findUnique({
        where: { code: product.gtin }
      })

      if (!eanRecord) {
        console.log('   ⚪ EAN não encontrado na tabela eancode (externo)')
        notFound++
        continue
      }

      if (eanRecord.used && eanRecord.productId === product.id) {
        console.log('   ✅ EAN já vinculado corretamente')
        alreadyUsed++
        continue
      }

      if (eanRecord.used && eanRecord.productId !== product.id) {
        console.log(`   ⚠️  EAN já usado por outro produto: ${eanRecord.productId}`)
        continue
      }

      // Marcar EAN como usado
      await prisma.eancode.update({
        where: { code: product.gtin },
        data: {
          used: true,
          productId: product.id,
          usedAt: new Date()
        }
      })

      console.log('   ✅ EAN marcado como usado')
      updated++
    }

    console.log('\n📊 RESUMO:')
    console.log(`   ✅ Atualizados: ${updated}`)
    console.log(`   ⚪ EANs externos: ${notFound}`)
    console.log(`   🔄 Já vinculados: ${alreadyUsed}`)
    console.log(`   📦 Total processados: ${products.length}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

syncExistingProducts()