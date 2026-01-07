const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  const product = await prisma.product.findFirst({
    where: {
      slug: '1005008476374826-1767598458286'
    },
    select: {
      id: true,
      name: true,
      images: true,
      specifications: true,
      variants: true,
      attributes: true
    }
  });

  if (product) {
    console.log('\n🔍 Produto encontrado:', product.name);
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
      console.log('Valor bruto:', product.images);
    }

    console.log('\n📋 Specifications:', product.specifications ? 'SIM' : 'NÃO');
    console.log('🎨 Variants:', product.variants ? 'SIM' : 'NÃO');
    console.log('📝 Attributes:', product.attributes ? 'SIM' : 'NÃO');
  } else {
    console.log('❌ Produto não encontrado!');
  }

  await prisma.$disconnect();
}

checkProduct();
