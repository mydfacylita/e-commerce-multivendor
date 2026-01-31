const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Buscar o produto Vp29
  const prod = await prisma.product.findFirst({
    where: { slug: { contains: 'vp29' } },
    select: {
      id: true,
      name: true,
      stock: true,
      description: true,
      variants: true,
      supplier: { select: { name: true } }
    }
  })
  
  console.log('========================================')
  console.log('Produto:', prod?.name?.substring(0, 60))
  console.log('Fornecedor:', prod?.supplier?.name)
  console.log('Stock no campo:', prod?.stock)
  console.log('Tem variants:', !!prod?.variants)
  
  console.log('\n📝 Descrição (primeiros 300 chars):')
  console.log(prod?.description?.substring(0, 300))
  
  if (prod?.variants) {
    try {
      const v = JSON.parse(prod.variants)
      console.log('\nFormato:', v.version ? 'NOVO (v' + v.version + ')' : 'LEGADO')
      
      if (v.version) {
        console.log('Properties:', v.properties?.map(p => `${p.name} (${p.type})`))
        console.log('SKUs:', v.skus?.length)
        console.log('Total Stock (metadata):', v.metadata?.totalStock)
        
        if (v.skus?.length > 0) {
          console.log('\nPrimeiros 3 SKUs:')
          v.skus.slice(0, 3).forEach((sku, i) => {
            const props = sku.properties.map(p => p.optionValue || p.optionLabel).join(', ')
            console.log(`  [${i+1}] ${props} - Stock: ${sku.stock}, Price: R$ ${sku.price}`)
          })
        }
      } else if (Array.isArray(v)) {
        console.log('É array de', v.length, 'items')
        console.log('Primeiro item:', JSON.stringify(v[0], null, 2))
      }
    } catch (e) {
      console.log('Erro ao parsear:', e.message)
      console.log('Primeiros 300 chars:', prod.variants?.substring(0, 300))
    }
  } else {
    console.log('\n⚠️ Produto SEM campo variants!')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
