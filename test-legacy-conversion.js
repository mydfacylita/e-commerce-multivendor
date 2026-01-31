const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Reproduzir a função de conversão
function convertToLegacyFormat(variants) {
  if (!variants || !variants.skus || variants.skus.length === 0) {
    return null
  }
  
  const colorProperty = variants.properties.find(p => p.type === 'color')
  const sizeProperty = variants.properties.find(p => p.type === 'size')
  
  // Se não tem nem cor nem tamanho, verificar se tem outras propriedades que podem servir
  if (!colorProperty && !sizeProperty) {
    // Tentar usar a primeira propriedade como "cor" e a segunda como "tamanho"
    if (variants.properties.length >= 1) {
      // Usar primeira propriedade como estilo/variação principal
      const mainProp = variants.properties[0]
      const secondProp = variants.properties.length > 1 ? variants.properties[1] : null
      
      return variants.skus.map(sku => {
        const mainValue = sku.properties.find(p => p.propertyId === mainProp.id)
        const secondValue = secondProp ? sku.properties.find(p => p.propertyId === secondProp.id) : null
        
        return {
          size: secondValue?.optionValue || secondValue?.optionLabel || 'Único',
          color: mainValue?.optionValue || mainValue?.optionLabel || 'Padrão',
          colorHex: guessColorHex(mainValue?.optionValue || mainValue?.optionLabel || ''),
          stock: sku.stock,
          price: sku.price
        }
      })
    }
    return null
  }
  
  return variants.skus.map(sku => {
    const colorProp = sku.properties.find(p => p.propertyId === colorProperty?.id)
    const sizeProp = sku.properties.find(p => p.propertyId === sizeProperty?.id)
    
    return {
      size: sizeProp?.optionValue || sizeProp?.optionLabel || 'Único',
      color: colorProp?.optionValue || colorProp?.optionLabel || 'Padrão',
      colorHex: guessColorHex(colorProp?.optionValue || colorProp?.optionLabel || ''),
      stock: sku.stock,
      price: sku.price
    }
  })
}

function guessColorHex(colorName) {
  const colorMap = {
    'preto': '#000000', 'branco': '#FFFFFF', 'vermelho': '#FF0000',
    'azul': '#0000FF', 'verde': '#00FF00', 'amarelo': '#FFFF00',
    'laranja': '#FFA500', 'rosa': '#FFC0CB', 'roxo': '#800080',
    'marrom': '#8B4513', 'cinza': '#808080', 'dourado': '#FFD700',
    'black': '#000000', 'white': '#FFFFFF', 'red': '#FF0000',
    'blue': '#0000FF', 'green': '#00FF00', 'yellow': '#FFFF00',
    'orange': '#FFA500', 'pink': '#FFC0CB', 'purple': '#800080',
    'brown': '#8B4513', 'gray': '#808080', 'gold': '#FFD700',
    'silver': '#C0C0C0', 'grey': '#808080'
  }
  
  const lowerName = colorName.toLowerCase()
  for (const [key, hex] of Object.entries(colorMap)) {
    if (lowerName.includes(key)) {
      return hex
    }
  }
  return '#808080'
}

async function main() {
  // Buscar o produto Vp29
  const p = await prisma.product.findFirst({
    where: { slug: { contains: 'vp29' } },
    select: { id: true, name: true, variants: true }
  })
  
  if (p && p.variants) {
    const v = JSON.parse(p.variants)
    
    console.log('========================================')
    console.log('Produto:', p.name.substring(0, 50))
    console.log('========================================')
    console.log('\n📦 NOVO FORMATO:')
    console.log('Properties:', v.properties?.map(x => `${x.name} (${x.type})`))
    console.log('SKUs:', v.skus?.length)
    console.log('\nPrimeiro SKU:')
    console.log(JSON.stringify(v.skus?.[0], null, 2))
    
    console.log('\n\n🔄 CONVERTIDO PARA LEGACY:')
    const legacy = convertToLegacyFormat(v)
    console.log('Legacy variants:', legacy?.length)
    console.log('\nPrimeiros 3 items:')
    legacy?.slice(0, 3).forEach((item, i) => {
      console.log(`\n[${i + 1}]`, JSON.stringify(item, null, 2))
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
