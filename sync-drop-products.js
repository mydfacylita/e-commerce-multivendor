const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Sincroniza produtos de dropshipping do vendedor com o status do produto original ADM
 * 
 * REGRA: Se o produto ADM original estiver:
 * - active: false → desativar cópia do vendedor
 * - availableForDropship: false → desativar cópia do vendedor
 */
async function syncDropProducts() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 SINCRONIZANDO PRODUTOS DROPSHIPPING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Buscar todos os produtos de vendedores que são dropshipping
  const vendorDropProducts = await prisma.product.findMany({
    where: {
      sellerId: { not: null },
      isDropshipping: true
    },
    select: {
      id: true,
      name: true,
      sellerId: true,
      active: true,
      price: true,
      slug: true
    }
  });
  
  console.log(`📦 Produtos DROP de vendedores: ${vendorDropProducts.length}\n`);
  
  let updated = 0;
  let errors = 0;
  
  for (const vp of vendorDropProducts) {
    // Buscar produto original da ADM pelo nome (sem sellerId)
    const originalProduct = await prisma.product.findFirst({
      where: {
        name: vp.name,
        sellerId: null // Produto da ADM
      },
      select: {
        id: true,
        name: true,
        active: true,
        availableForDropship: true
      }
    });
    
    if (!originalProduct) {
      console.log(`⚠️  ${vp.name} - Produto original não encontrado`);
      errors++;
      continue;
    }
    
    // Verificar se precisa desativar
    const shouldBeActive = originalProduct.active && originalProduct.availableForDropship;
    
    if (vp.active && !shouldBeActive) {
      console.log(`❌ ${vp.name}`);
      console.log(`   Produto original: active=${originalProduct.active}, availableForDropship=${originalProduct.availableForDropship}`);
      console.log(`   Produto vendedor: active=${vp.active}`);
      console.log(`   AÇÃO: Desativando produto do vendedor...`);
      
      await prisma.product.update({
        where: { id: vp.id },
        data: { 
          active: false,
          isDropshipping: false // Também remove flag de dropshipping
        }
      });
      
      updated++;
      console.log(`   ✅ Desativado!\n`);
    } else if (!vp.active && shouldBeActive) {
      console.log(`✅ ${vp.name}`);
      console.log(`   Produto original ativo, vendedor pode reativar manualmente`);
    } else {
      console.log(`✅ ${vp.name} - OK`);
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 RESUMO:`);
  console.log(`   Produtos verificados: ${vendorDropProducts.length}`);
  console.log(`   Produtos atualizados: ${updated}`);
  console.log(`   Erros/Não encontrados: ${errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

syncDropProducts();
