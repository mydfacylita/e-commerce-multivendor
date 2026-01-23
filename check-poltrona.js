const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { name: { contains: 'Poltrona' } },
    select: { 
      id: true, 
      name: true, 
      images: true, 
      sellerId: true, 
      active: true 
    }
  });
  
  console.log('Produtos encontrados:', products.length);
  products.forEach(p => {
    console.log('\n--- Produto ---');
    console.log('ID:', p.id);
    console.log('Nome:', p.name);
    console.log('Seller ID:', p.sellerId);
    console.log('Ativo:', p.active);
    console.log('Imagens:', JSON.stringify(p.images, null, 2));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
