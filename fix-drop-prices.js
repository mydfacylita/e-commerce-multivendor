const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDropPrices() {
  console.log('\n📋 Verificando produtos dropshipping ativos...\n');
  
  // Buscar produtos dropshipping dos vendedores
  const dropProducts = await prisma.product.findMany({
    where: {
      isDropshipping: true,
      sellerId: { not: null },
      supplierSku: { not: null },
      active: true
    },
    select: {
      id: true,
      name: true,
      price: true,
      supplierSku: true,
      active: true,
      seller: { select: { storeName: true } }
    }
  });

  console.log(`Total de produtos dropshipping ativos: ${dropProducts.length}\n`);
  
  const problemas = [];
  let desativados = 0;

  for (const p of dropProducts) {
    // Buscar produto original
    const original = await prisma.product.findUnique({
      where: { id: p.supplierSku },
      select: { price: true, name: true, active: true }
    });

    if (!original) {
      console.log(`⚠️ Produto original não encontrado para: ${p.name}`);
      console.log(`   SupplierSku: ${p.supplierSku}`);
      console.log('   → Desativando produto do vendedor...\n');
      
      await prisma.product.update({
        where: { id: p.id },
        data: { active: false }
      });
      desativados++;
      continue;
    }

    if (p.price < original.price) {
      problemas.push({
        id: p.id,
        nome: p.name,
        vendedor: p.seller?.storeName || 'N/A',
        precoVendedor: p.price,
        precoOriginal: original.price
      });
      
      console.log('❌ PREÇO ABAIXO DO MÍNIMO:');
      console.log('   Produto:', p.name);
      console.log('   Vendedor:', p.seller?.storeName);
      console.log('   Preço vendedor: R$', p.price.toFixed(2));
      console.log('   Preço mínimo:   R$', original.price.toFixed(2));
      console.log('   Diferença:     -R$', (original.price - p.price).toFixed(2));
      console.log('   → Desativando produto...\n');
      
      // Desativar o produto
      await prisma.product.update({
        where: { id: p.id },
        data: { active: false }
      });
      desativados++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO:');
  console.log('   Total dropshipping ativos:', dropProducts.length);
  console.log('   Com preço abaixo do mínimo:', problemas.length);
  console.log('   ✅ Produtos desativados:', desativados);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

fixDropPrices().catch(console.error);
