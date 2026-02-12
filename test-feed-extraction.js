const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Funções helper
function extractColor(product) {
  // 1. Campo color direto
  if (product.color && product.color.trim()) {
    return product.color.trim()
  }
  
  // 2. Tentar extrair do variants JSON
  if (product.variants) {
    try {
      const variants = JSON.parse(product.variants)
      if (Array.isArray(variants) && variants.length > 0) {
        for (const variant of variants) {
          if (variant.color || variant.cor) {
            return variant.color || variant.cor
          }
          if (variant.attributes) {
            const colorAttr = variant.attributes.find(a => 
              a.name?.toLowerCase().includes('cor') || 
              a.name?.toLowerCase().includes('color') ||
              a.nome?.toLowerCase().includes('cor')
            )
            if (colorAttr) return colorAttr.value || colorAttr.valor
          }
        }
      }
    } catch (e) {
      // Ignorar erro
    }
  }
  
  // 3. Tentar extrair do attributes JSON
  if (product.attributes) {
    try {
      const attributes = JSON.parse(product.attributes)
      if (Array.isArray(attributes)) {
        const colorAttr = attributes.find(a => 
          a.name?.toLowerCase().includes('cor') || 
          a.name?.toLowerCase().includes('color') ||
          a.nome?.toLowerCase().includes('cor')
        )
        if (colorAttr) {
          return colorAttr.value || colorAttr.valor
        }
      }
    } catch (e) {
      // Ignorar erro
    }
  }
  
  // 4. Extrair do nome
  const colorRegex = /(preto|branco|vermelho|azul|verde|amarelo|rosa|roxo|laranja|cinza|marrom|bege|dourado|prateado|black|white|red|blue|green|yellow|pink|purple|orange|gray|brown|beige|gold|silver)/i
  const match = product.name?.match(colorRegex)
  if (match) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
  }
  
  return 'Variado'
}

function extractSize(product) {
  // 1. Tentar extrair do sizes JSON
  if (product.sizes) {
    try {
      const sizes = JSON.parse(product.sizes)
      if (Array.isArray(sizes) && sizes.length > 0) {
        if (sizes.length === 1) {
          return sizes[0].size || sizes[0].name || sizes[0]
        } else {
          return sizes.map(s => s.size || s.name || s).join('/')
        }
      }
    } catch (e) {
      // Ignorar erro
    }
  }
  
  // 2. Tentar extrair do variants JSON
  if (product.variants) {
    try {
      const variants = JSON.parse(product.variants)
      if (Array.isArray(variants) && variants.length > 0) {
        const sizes = []
        for (const variant of variants) {
          if (variant.size || variant.tamanho) {
            sizes.push(variant.size || variant.tamanho)
          }
          if (variant.attributes) {
            const sizeAttr = variant.attributes.find(a => 
              a.name?.toLowerCase().includes('tamanho') || 
              a.name?.toLowerCase().includes('size') ||
              a.nome?.toLowerCase().includes('tamanho')
            )
            if (sizeAttr) sizes.push(sizeAttr.value || sizeAttr.valor)
          }
        }
        if (sizes.length > 0) {
          return sizes.length === 1 ? sizes[0] : sizes.join('/')
        }
      }
    } catch (e) {
      // Ignorar erro
    }
  }
  
  // 3. Tentar extrair do attributes JSON
  if (product.attributes) {
    try {
      const attributes = JSON.parse(product.attributes)
      if (Array.isArray(attributes)) {
        const sizeAttr = attributes.find(a => 
          a.name?.toLowerCase().includes('tamanho') || 
          a.name?.toLowerCase().includes('size') ||
          a.nome?.toLowerCase().includes('tamanho')
        )
        if (sizeAttr) {
          return sizeAttr.value || sizeAttr.valor
        }
      }
    } catch (e) {
      // Ignorar erro
    }
  }
  
  return null
}

async function testFeedLogic() {
  try {
    console.log('🧪 Testando lógica de extração de dados...\n')
    
    const products = await prisma.product.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        color: true,
        variants: true,
        attributes: true,
        sizes: true
      },
      take: 10
    })

    console.log(`Testando ${products.length} produtos:\n`)

    for (const product of products) {
      const color = extractColor(product)
      const size = extractSize(product)
      
      console.log(`📦 ${product.name.substring(0, 60)}`)
      console.log(`   🎨 Cor: ${color}`)
      console.log(`   📏 Tamanho: ${size || '(não especificado)'}`)
      console.log(``)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testFeedLogic()
