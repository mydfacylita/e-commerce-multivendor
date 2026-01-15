/**
 * 🔍 Consultar produto específico
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProduct() {
  console.log('🔍 Consultando produto cmk4d6tko000g9o4rs0x2t1qz...\n');

  try {
    const product = await prisma.product.findUnique({
      where: {
        id: 'cmk4d6tko000g9o4rs0x2t1qz'
      },
      include: {
        category: true,
        seller: true
      }
    });

    if (!product) {
      console.log('❌ Produto não encontrado!');
      return;
    }

    console.log('✅ PRODUTO ENCONTRADO:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 ID: ${product.id}`);
    console.log(`📝 Nome: ${product.name}`);
    console.log(`🏷️ Slug: ${product.slug}`);
    console.log(`💰 Preço: R$ ${product.price.toFixed(2)}`);
    console.log(`📊 Estoque: ${product.stock}`);
    console.log(`🏷️ Categoria: ${product.category?.name || 'Sem categoria'}`);
    console.log(`👤 Vendedor: ${product.seller?.name || 'Sem vendedor'}`);
    console.log(`📷 Imagens: ${product.images ? JSON.parse(product.images).length : 0} imagens`);
    console.log(`✅ Ativo: ${product.active ? 'Sim' : 'Não'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📏 DIMENSÕES E PESO:');
    console.log(`⚖️ Peso: ${product.weight || 'NÃO CONFIGURADO'} kg`);
    console.log(`⚖️ Peso com embalagem: ${product.weightWithPackage || 'NÃO CONFIGURADO'} kg`);
    console.log(`📐 Dimensões: ${product.length || '?'} x ${product.width || '?'} x ${product.height || '?'} cm`);
    console.log(`📦 Dim. com embalagem: ${product.lengthWithPackage || '?'} x ${product.widthWithPackage || '?'} x ${product.heightWithPackage || '?'} cm\n`);

    console.log('💼 INFORMAÇÕES COMERCIAIS:');
    console.log(`💵 Custo: R$ ${product.costPrice?.toFixed(2) || 'N/A'}`);
    console.log(`🚚 Custo frete: R$ ${product.shippingCost?.toFixed(2) || 'N/A'}`);
    console.log(`📈 Margem: ${product.margin?.toFixed(2) || 'N/A'}%`);
    console.log(`🏪 Dropshipping: ${product.isDropshipping ? 'Sim' : 'Não'}`);
    console.log(`📱 Aceita cartão: ${product.acceptsCreditCard ? 'Sim' : 'Não'}`);
    console.log(`💳 Max parcelas: ${product.maxInstallments || 'N/A'}x\n`);

    if (product.specifications) {
      console.log('📋 ESPECIFICAÇÕES:');
      try {
        const specs = JSON.parse(product.specifications);
        Object.entries(specs).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
        console.log('');
      } catch (e) {
        console.log('   Erro ao parsear especificações\n');
      }
    }

    console.log('📅 DATAS:');
    console.log(`📅 Criado em: ${product.createdAt.toLocaleString('pt-BR')}`);
    console.log(`🔄 Atualizado em: ${product.updatedAt.toLocaleString('pt-BR')}\n`);

    // Verificar se precisa de peso/dimensões
    const needsWeightDimensions = !product.weight || !product.length || !product.width || !product.height;
    if (needsWeightDimensions) {
      console.log('⚠️  ESTE PRODUTO PRECISA DE PESO E DIMENSÕES PARA CÁLCULO DE FRETE!');
      console.log('💡 Para adicionar, use o comando:');
      console.log(`   UPDATE product SET`);
      console.log(`     weight = [peso_em_kg],`);
      console.log(`     length = [comprimento_cm],`);
      console.log(`     width = [largura_cm],`);
      console.log(`     height = [altura_cm]`);
      console.log(`   WHERE id = '${product.id}';`);
    }

  } catch (error) {
    console.error('❌ Erro ao consultar produto:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProduct();