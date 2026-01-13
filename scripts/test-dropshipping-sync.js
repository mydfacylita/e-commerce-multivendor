/**
 * Script de teste para a sincronização de produtos dropshipping
 * 
 * Uso: node scripts/test-dropshipping-sync.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 TESTE DE SINCRONIZAÇÃO DROPSHIPPING')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. Buscar um produto dropshipping do admin (sem sellerId)
  console.log('1️⃣  Buscando produto dropshipping do admin...')
  const adminProduct = await prisma.product.findFirst({
    where: {
      isDropshipping: true,
      sellerId: null,
      availableForDropship: true
    },
    select: {
      id: true,
      name: true,
      price: true,
      description: true,
      images: true,
      dropshippingCommission: true
    }
  })

  if (!adminProduct) {
    console.log('❌ Nenhum produto dropshipping do admin encontrado')
    console.log('   Crie um produto com isDropshipping: true e sellerId: null')
    return
  }

  console.log(`   ✅ Encontrado: ${adminProduct.name}`)
  console.log(`   🆔 ID: ${adminProduct.id}`)
  console.log(`   💰 Preço: R$ ${adminProduct.price.toFixed(2)}`)

  // 2. Buscar vendedores que estão dropando este produto
  console.log('\n2️⃣  Buscando produtos de vendedores que dropam este...')
  const droppedProducts = await prisma.product.findMany({
    where: {
      supplierSku: adminProduct.id,
      sellerId: { not: null }
    },
    include: {
      seller: true
    }
  })

  if (droppedProducts.length === 0) {
    console.log('   ⚠️  Nenhum vendedor está dropando este produto')
    console.log('   Para testar, um vendedor precisa adicionar este produto ao catálogo')
  } else {
    console.log(`   📦 ${droppedProducts.length} vendedor(es) dropando:`)
    for (const p of droppedProducts) {
      const status = p.active ? '✅ Ativo' : '⛔ Inativo'
      console.log(`      - ${p.seller?.storeName || 'Desconhecido'}: R$ ${p.price.toFixed(2)} (${status})`)
    }
  }

  // 3. Simular o que aconteceria se aumentássemos o preço
  console.log('\n3️⃣  Simulando aumento de preço do admin...')
  const novoPrecoSimulado = adminProduct.price * 1.5
  console.log(`   📈 Novo preço simulado: R$ ${novoPrecoSimulado.toFixed(2)}`)
  
  let seraoInativados = 0
  for (const p of droppedProducts) {
    if (p.price < novoPrecoSimulado) {
      console.log(`   ⚠️  ${p.seller?.storeName}: R$ ${p.price.toFixed(2)} < R$ ${novoPrecoSimulado.toFixed(2)} → SERIA INATIVADO`)
      seraoInativados++
    } else {
      console.log(`   ✅ ${p.seller?.storeName}: R$ ${p.price.toFixed(2)} >= R$ ${novoPrecoSimulado.toFixed(2)} → OK`)
    }
  }

  console.log(`\n📊 RESUMO DA SIMULAÇÃO:`)
  console.log(`   Total de drops: ${droppedProducts.length}`)
  console.log(`   Seriam sincronizados: ${droppedProducts.length - seraoInativados}`)
  console.log(`   Seriam inativados: ${seraoInativados}`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ TESTE CONCLUÍDO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('Para testar a sincronização real:')
  console.log('1. Acesse o admin e edite o produto dropshipping')
  console.log('2. Altere qualquer campo (descrição, imagens, preço, etc)')
  console.log('3. Salve e verifique os logs do servidor')
  console.log('4. Os produtos dos vendedores serão atualizados automaticamente\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
