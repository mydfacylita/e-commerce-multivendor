const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Buscar produto AliExpress
  const products = await prisma.product.findMany({
    where: {
      supplier: {
        name: {
          contains: 'AliExpress'
        }
      }
    },
    take: 3,
    select: {
      id: true,
      name: true,
      variants: true,
      supplier: {
        select: { name: true }
      }
    }
  })
  
  for (const p of products) {
    console.log('\n========================================')
    console.log('Produto:', p.name?.substring(0, 50))
    console.log('Fornecedor:', p.supplier?.name)
    console.log('Tem variants:', !!p.variants)
    
    if (p.variants) {
      console.log('Tipo:', typeof p.variants)
      console.log('Tamanho:', p.variants.length, 'chars')
      
      try {
        const parsed = JSON.parse(p.variants)
        console.log('Keys do JSON:', Object.keys(parsed))
        
        if (parsed.version) {
          console.log('✅ NOVO FORMATO - versão:', parsed.version)
          console.log('Source:', parsed.source)
          console.log('Properties:', parsed.properties?.map(p => `${p.name} (${p.type})`))
          console.log('SKUs:', parsed.skus?.length)
        } else if (Array.isArray(parsed)) {
          console.log('📦 FORMATO ARRAY - items:', parsed.length)
          if (parsed[0]) {
            console.log('Primeiro item keys:', Object.keys(parsed[0]))
          }
        } else {
          console.log('❓ FORMATO DESCONHECIDO')
          console.log('Primeiros 300 chars:', p.variants.substring(0, 300))
        }
      } catch (e) {
        console.log('❌ Erro ao parsear:', e.message)
        console.log('Primeiros 200 chars:', p.variants?.substring(0, 200))
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
