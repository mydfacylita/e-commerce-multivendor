const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Buscar todos os produtos ativos e ver suas imagens
  const products = await p.product.findMany({ where: { active: true }, take: 20 });
  
  console.log('\n=== IMAGENS DOS PRODUTOS ===\n');
  products.forEach(product => {
    let images = product.images;
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch(e) {}
    }
    console.log(`${product.name}:`);
    if (Array.isArray(images)) {
      images.forEach(img => console.log(`  - ${img.substring(0, 80)}...`));
    } else {
      console.log(`  - ${images}`);
    }
    console.log('');
  });
  
  // Buscar config da loja (logo)
  const config = await p.systemConfig.findFirst({ where: { key: 'site_logo' } });
  console.log('\n=== LOGO DA LOJA ===');
  console.log(config?.value || 'Não encontrado');
}

main().finally(() => p.$disconnect());
