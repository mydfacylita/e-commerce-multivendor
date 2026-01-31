const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    // Atualizar todos os produtos que têm supplierId mas isDropshipping=false
    const result = await prisma.product.updateMany({
      where: {
        supplierId: { not: null },
        isDropshipping: false
      },
      data: {
        isDropshipping: true
      }
    });

    console.log(`Produtos atualizados: ${result.count}`);
    
    // Mostrar produtos que foram atualizados
    const products = await prisma.product.findMany({
      where: {
        supplierId: { not: null }
      },
      select: {
        id: true,
        name: true,
        isDropshipping: true,
        supplierId: true
      }
    });

    console.log('\nProdutos com fornecedor:');
    for (const p of products) {
      console.log(`  - ${p.name.substring(0, 50)}... | isDropshipping: ${p.isDropshipping}`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Erro:', error);
    await prisma.$disconnect();
  }
}

fix();
