const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInactiveDropProducts() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 CORRIGINDO PRODUTOS DROP COM ORIGINAL INATIVO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Buscar produtos do vendedor que são dropshipping
  const vendorProducts = await prisma.product.findMany({
    where: {
      sellerId: { not: null },
      isDropshipping: true,
      supplierSku: { not: null },
      active: true // Só os que estão ativos
    },
    include: {
      seller: {
        select: { storeName: true, nomeFantasia: true }
      }
    }
  });
  
  console.log(`📦 Produtos DROP ativos de vendedores: ${vendorProducts.length}\n`);
  
  let fixed = 0;
  
  for (const vp of vendorProducts) {
    // Buscar produto original ADM
    const original = await prisma.product.findUnique({
      where: { id: vp.supplierSku },
      select: { id: true, name: true, active: true, availableForDropship: true }
    });
    
    if (!original) {
      console.log(`⚠️  ${vp.name} - Original não encontrado (supplierSku: ${vp.supplierSku})`);
      continue;
    }
    
    // Verificar se precisa desativar
    const shouldBeInactive = !original.active || !original.availableForDropship;
    
    if (shouldBeInactive && vp.active) {
      const sellerName = vp.seller?.storeName || vp.seller?.nomeFantasia || 'Desconhecido';
      const reason = !original.active ? 'produto original inativo' : 'não disponível para dropship';
      
      console.log(`❌ ${vp.name} [Vendedor: ${sellerName}]`);
      console.log(`   Original: active=${original.active}, availableForDropship=${original.availableForDropship}`);
      console.log(`   AÇÃO: Desativando (${reason})...`);
      
      await prisma.product.update({
        where: { id: vp.id },
        data: { 
          active: false,
          lastSyncAt: new Date()
        }
      });
      
      fixed++;
      console.log(`   ✅ Desativado!\n`);
    } else {
      console.log(`✅ ${vp.name} - OK (original ativo e disponível)`);
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 RESUMO:`);
  console.log(`   Verificados: ${vendorProducts.length}`);
  console.log(`   Desativados: ${fixed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await prisma.$disconnect();
}

fixInactiveDropProducts();
