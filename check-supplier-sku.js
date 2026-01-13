const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSupplierSku() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICANDO supplierSku DOS PRODUTOS DROP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Produtos do vendedor que são dropshipping
  const vendorProducts = await prisma.product.findMany({
    where: {
      sellerId: { not: null },
      isDropshipping: true
    },
    select: {
      id: true,
      name: true,
      sellerId: true,
      supplierSku: true,
      active: true,
      isDropshipping: true
    }
  });
  
  console.log(`📦 Produtos DROP de vendedores: ${vendorProducts.length}\n`);
  
  for (const p of vendorProducts) {
    console.log(`   - ${p.name}`);
    console.log(`     ID: ${p.id}`);
    console.log(`     supplierSku: ${p.supplierSku || 'NULL ⚠️'}`);
    console.log(`     active: ${p.active}`);
    
    // Se tem supplierSku, verificar se produto original existe
    if (p.supplierSku) {
      const original = await prisma.product.findUnique({
        where: { id: p.supplierSku },
        select: { id: true, name: true, active: true, availableForDropship: true }
      });
      
      if (original) {
        console.log(`     ✅ Original: ${original.name} (active=${original.active}, availableForDropship=${original.availableForDropship})`);
      } else {
        console.log(`     ❌ Original NÃO encontrado!`);
      }
    }
    console.log('');
  }
  
  // Verificar produtos ADM que permitem dropship
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏪 PRODUTOS ADM DISPONÍVEIS PARA DROPSHIP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const adminProducts = await prisma.product.findMany({
    where: {
      sellerId: null,
      isDropshipping: true
    },
    select: {
      id: true,
      name: true,
      active: true,
      availableForDropship: true,
      isDropshipping: true
    }
  });
  
  console.log(`🏪 Produtos ADM dropshipping: ${adminProducts.length}\n`);
  for (const p of adminProducts) {
    console.log(`   - ${p.name}`);
    console.log(`     ID: ${p.id}`);
    console.log(`     active: ${p.active}`);
    console.log(`     availableForDropship: ${p.availableForDropship}`);
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkSupplierSku();
