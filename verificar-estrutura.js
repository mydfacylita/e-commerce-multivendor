// Script para verificar e corrigir estrutura de variants e selectedSkus
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verificarECorrigir() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('VERIFICAÇÃO DE ESTRUTURA JSON - PRODUTOS ALIEXPRESS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Buscar apenas produtos do AliExpress (supplierSku numérico)
  const todosProducts = await prisma.product.findMany({
    where: {
      variants: { not: null },
      supplierSku: { not: null }
    },
    select: {
      id: true,
      name: true,
      supplierSku: true,
      variants: true,
      selectedSkus: true,
      supplierUrl: true
    }
  })

  // Filtrar apenas produtos AliExpress (SKU numérico)
  const produtosAliexpress = todosProducts.filter(p => 
    p.supplierSku && /^\d+$/.test(p.supplierSku)
  )

  console.log(`📦 Total de produtos com variants: ${todosProducts.length}`)
  console.log(`📦 Produtos AliExpress (SKU numérico): ${produtosAliexpress.length}\n`)

  let corretos = 0
  let incorretos = 0
  const produtosIncorretos = []

  for (const p of produtosAliexpress) {
    try {
      const v = JSON.parse(p.variants)
      const s = p.selectedSkus ? JSON.parse(p.selectedSkus) : null

      // Verificar se variants tem estrutura correta
      const variantsOk = v.version === '1.0' && v.source && v.sourceProductId

      // Verificar se selectedSkus tem estrutura correta
      let selectedSkusOk = true
      if (s && s.length > 0) {
        const campos = Object.keys(s[0])
        selectedSkusOk = campos.includes('margin') && !campos.includes('sku_id')
      }

      if (variantsOk && selectedSkusOk) {
        corretos++
      } else {
        incorretos++
        produtosIncorretos.push({
          id: p.id,
          sku: p.supplierSku,
          name: p.name?.substring(0, 40),
          variantsOk,
          selectedSkusOk,
          variants: v,
          selectedSkus: s
        })
      }
    } catch (e) {
      incorretos++
      produtosIncorretos.push({
        id: p.id,
        sku: p.supplierSku,
        name: p.name?.substring(0, 40),
        error: e.message
      })
    }
  }

  console.log(`✅ Produtos AliExpress com estrutura CORRETA: ${corretos}`)
  console.log(`❌ Produtos AliExpress com estrutura INCORRETA: ${incorretos}`)

  if (produtosIncorretos.length > 0) {
    console.log('\n📋 Lista de produtos AliExpress incorretos:')
    produtosIncorretos.forEach((p, i) => {
      console.log(`   ${i + 1}. SKU: ${p.sku}`)
      console.log(`      Nome: ${p.name}`)
      console.log(`      variants: ${p.variantsOk ? '✅' : '❌'} | selectedSkus: ${p.selectedSkusOk ? '✅' : '❌'}`)
      if (p.error) console.log(`      Erro: ${p.error}`)
    })

    // Perguntar se quer corrigir
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('CORRIGINDO PRODUTOS...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    for (const p of produtosIncorretos) {
      if (p.error) {
        console.log(`⏭️ Pulando ${p.sku} (erro de parse)`)
        continue
      }

      let needsUpdate = false
      const updateData = {}

      // Corrigir variants se necessário
      if (!p.variantsOk && p.variants) {
        const v = p.variants
        const correctedVariants = {
          version: '1.0',
          source: 'aliexpress',
          sourceProductId: p.sku,
          lastUpdated: new Date().toISOString(),
          properties: v.properties?.map((prop, idx) => ({
            id: String(prop.id || idx + 1),
            name: prop.name?.toLowerCase() || 'opção',
            type: prop.name?.toLowerCase().includes('cor') ? 'color' : 
                  prop.name?.toLowerCase().includes('tamanho') ? 'size' : 'other',
            options: (prop.values || prop.options || []).map((opt, optIdx) => ({
              id: String(opt.id || optIdx + 1),
              value: opt.name || opt.value || '',
              label: opt.name || opt.label || opt.value || '',
              image: opt.image
            }))
          })) || [],
          skus: v.skus?.map(sku => ({
            skuId: sku.skuId,
            skuAttr: sku.skuAttr,
            price: sku.price,
            stock: sku.stock || 0,
            available: (sku.stock || 0) > 0,
            image: sku.image,
            properties: sku.properties || []
          })) || [],
          metadata: v.metadata || {
            currency: 'BRL',
            minPrice: Math.min(...(v.skus?.map(s => s.price) || [0])),
            maxPrice: Math.max(...(v.skus?.map(s => s.price) || [0])),
            totalStock: (v.skus || []).reduce((sum, s) => sum + (s.stock || 0), 0),
            hasImages: (v.skus || []).some(s => s.image)
          }
        }
        updateData.variants = JSON.stringify(correctedVariants)
        needsUpdate = true
      }

      // Corrigir selectedSkus se necessário
      if (!p.selectedSkusOk && p.selectedSkus) {
        const correctedSkus = p.selectedSkus.map(sku => ({
          skuId: sku.skuId || sku.sku_id,
          enabled: sku.enabled !== false,
          customPrice: sku.customPrice || (sku.costPrice * 1.5),
          margin: sku.margin || 50,
          costPrice: sku.costPrice
        }))
        updateData.selectedSkus = JSON.stringify(correctedSkus)
        needsUpdate = true
      }

      if (needsUpdate) {
        await prisma.product.update({
          where: { id: p.id },
          data: updateData
        })
        console.log(`✅ Corrigido: ${p.sku} - ${p.name}`)
      }
    }
  }

  console.log('\n✅ Verificação concluída!')
  await prisma.$disconnect()
}

verificarECorrigir().catch(console.error)
