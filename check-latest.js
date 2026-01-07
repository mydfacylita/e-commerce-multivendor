const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestProduct() {
  const product = await prisma.product.findFirst({
    orderBy: {
      updatedAt: 'desc'
    },
    select: {
      id: true,
      name: true,
      images: true,
      specifications: true,
      variants: true,
      supplierSku: true,
      updatedAt: true
    }
  });

  if (product) {
    console.log('\n🔍 Produto encontrado:', product.name);
    console.log('📅 Última atualização:', product.updatedAt);
    console.log('🔖 SKU:', product.supplierSku);
    console.log('\n📸 Campo images:', product.images);
    
    try {
      const imagesArray = JSON.parse(product.images);
      console.log('\n✅ Total de imagens no array:', imagesArray.length);
      console.log('URLs das imagens:');
      imagesArray.forEach((img, i) => {
        console.log(`  ${i + 1}. ${img}`);
      });
    } catch (e) {
      console.log('\n❌ Erro ao parsear JSON de imagens:', e.message);
    }

    console.log('\n📋 Specifications:', product.specifications ? 'SIM' : 'NÃO');
    console.log('🎨 Variants:', product.variants ? 'SIM' : 'NÃO');
  } else {
    console.log('❌ Produto não encontrado! Verifique o supplierSku');
  }

  await prisma.$disconnect();
}

checkLatestProduct();
