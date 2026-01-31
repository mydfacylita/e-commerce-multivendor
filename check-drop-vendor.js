const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const prods = await prisma.product.findMany({
    where: { sellerId: { not: null }, isDropshipping: true },
    select: { id: true, name: true, supplierSku: true, active: true, seller: { select: { storeName: true } } },
    take: 10
  });

  console.log('=== Produtos DROP de vendedores ===\n');
  
  for (const pr of prods) {
    console.log('Produto:', pr.name?.substring(0, 50));
    console.log('  ID:', pr.id);
    console.log('  Ativo:', pr.active);
    console.log('  supplierSku:', pr.supplierSku);
    console.log('  Vendedor:', pr.seller?.storeName);
    
    if (pr.supplierSku) {
      const o = await prisma.product.findUnique({
        where: { id: pr.supplierSku },
        select: { id: true, active: true, availableForDropship: true, name: true }
      });
      
      if (o) {
        console.log('  >> ORIGINAL:', o.name?.substring(0, 30));
        console.log('     active:', o.active, '| availableForDropship:', o.availableForDropship);
        
        if (!o.active || !o.availableForDropship) {
          console.log('  ⚠️  PROBLEMA: Vendedor pode ativar mas original indisponível!');
        }
      } else {
        console.log('  ⚠️  ORIGINAL NÃO EXISTE!');
      }
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
