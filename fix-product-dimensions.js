/**
 * 🔧 Corrigir dimensões do produto para valores realistas
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function corrigirDimensoes() {
  console.log('🔧 Corrigindo dimensões da camiseta para valores realistas...\n');

  try {
    const product = await prisma.product.update({
      where: { id: 'cmk4d6tko000g9o4rs0x2t1qz' },
      data: {
        // Dimensões realistas para uma camiseta dobrada
        weight: 0.32,           // 320g - peso OK
        length: 25,             // 25cm de comprimento
        width: 20,              // 20cm de largura  
        height: 3,              // 3cm de altura (dobrada)
        
        // Com embalagem (um pouco maior)
        weightWithPackage: 0.48,
        lengthWithPackage: 28,
        widthWithPackage: 23,
        heightWithPackage: 5
      }
    });

    console.log('✅ Dimensões atualizadas com sucesso!');
    console.log('\n📏 NOVAS DIMENSÕES:');
    console.log(`   Peso: ${product.weight}kg (${product.weight * 1000}g)`);
    console.log(`   Dimensões: ${product.length}x${product.width}x${product.height}cm`);
    console.log(`   Com embalagem: ${product.lengthWithPackage}x${product.widthWithPackage}x${product.heightWithPackage}cm\n`);

    console.log('🎯 Agora testando novamente a API...');

  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corrigirDimensoes();