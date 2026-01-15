const { PrismaClient } = require('@prisma/client');

async function updateProductWeightsAndDimensions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📦 Atualizando peso e dimensões dos produtos...\n');
    
    // Produtos com peso e dimensões típicas
    const productUpdates = [
      // Smartphones
      {
        name: 'Smartphone Galaxy S23',
        weight: 0.168, // 168g
        length: 15, width: 7, height: 0.8, // 15x7x0.8cm
        weightWithPackage: 0.250,
        lengthWithPackage: 20, widthWithPackage: 12, heightWithPackage: 5
      },
      // Notebooks  
      {
        name: 'Notebook Dell Inspiron 15',
        weight: 1.8, // 1.8kg
        length: 36, width: 24, height: 2, // 36x24x2cm
        weightWithPackage: 2.5,
        lengthWithPackage: 42, widthWithPackage: 30, heightWithPackage: 8
      },
      // Fones
      {
        name: 'Fone Bluetooth JBL',
        weight: 0.180, // 180g
        length: 18, width: 16, height: 7, // 18x16x7cm
        weightWithPackage: 0.350,
        lengthWithPackage: 25, widthWithPackage: 20, heightWithPackage: 10
      },
      // Tênis
      {
        name: 'Tênis Nike Air Max',
        weight: 0.600, // 600g
        length: 32, width: 20, height: 12, // 32x20x12cm (caixa de sapato)
        weightWithPackage: 0.800,
        lengthWithPackage: 35, widthWithPackage: 23, heightWithPackage: 15
      },
      // Livros
      {
        name: 'Livro: Clean Code',
        weight: 0.450, // 450g
        length: 23, width: 15, height: 3, // 23x15x3cm
        weightWithPackage: 0.550,
        lengthWithPackage: 26, widthWithPackage: 18, heightWithPackage: 6
      }
    ];
    
    for (const productData of productUpdates) {
      try {
        const product = await prisma.product.findFirst({
          where: { 
            name: { contains: productData.name.split(' ')[1] } // Busca por parte do nome
          }
        });
        
        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              weight: productData.weight,
              length: productData.length,
              width: productData.width,
              height: productData.height,
              weightWithPackage: productData.weightWithPackage,
              lengthWithPackage: productData.lengthWithPackage,
              widthWithPackage: productData.widthWithPackage,
              heightWithPackage: productData.heightWithPackage
            }
          });
          
          console.log(`✅ ${product.name}: ${productData.weight}kg, ${productData.length}x${productData.width}x${productData.height}cm`);
        } else {
          console.log(`⚠️  Produto não encontrado: ${productData.name}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao atualizar ${productData.name}: ${error.message}`);
      }
    }
    
    // Mostra produtos restantes sem peso
    const remainingProducts = await prisma.product.findMany({
      where: {
        OR: [
          { weight: null },
          { weight: 0 }
        ]
      },
      select: {
        id: true,
        name: true
      },
      take: 10
    });
    
    console.log(`\n📊 Ainda restam ${remainingProducts.length} produtos sem peso configurado`);
    if (remainingProducts.length > 0) {
      console.log('📝 Para configurar peso/dimensões via admin, acesse:');
      console.log('   http://localhost:3000/admin/produtos');
      console.log('\n💡 Dicas para peso e dimensões:');
      console.log('   • Eletrônicos pequenos: 0.1-0.5kg, 10-20cm');
      console.log('   • Livros: 0.3-0.8kg, 20-25cm');
      console.log('   • Roupas: 0.2-0.6kg, 25-35cm');
      console.log('   • Calçados: 0.5-1.2kg, 30-35cm');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProductWeightsAndDimensions();