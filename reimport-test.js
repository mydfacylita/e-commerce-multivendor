// Script para reimportar o produto e verificar estrutura
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reimportTest() {
  const productId = '1005008496972052';
  
  // Buscar produto atual
  const product = await prisma.product.findFirst({
    where: { supplierSku: productId }
  });

  if (!product) {
    console.log('Produto não encontrado');
    return;
  }

  console.log('=== PRODUTO ANTES DA CORREÇÃO ===');
  console.log('ID:', product.id);
  console.log('Nome:', product.name.substring(0, 50) + '...');
  
  if (product.variants) {
    const variants = JSON.parse(product.variants);
    console.log('\n--- VARIANTS ---');
    console.log('SKUs com properties vazias:', variants.skus?.filter(s => !s.properties || s.properties.length === 0).length || 0);
    console.log('SKUs com properties preenchidas:', variants.skus?.filter(s => s.properties && s.properties.length > 0).length || 0);
    console.log('Primeiro SKU:', JSON.stringify(variants.skus?.[0], null, 2));
  }

  await prisma.$disconnect();
}

reimportTest().catch(console.error);
