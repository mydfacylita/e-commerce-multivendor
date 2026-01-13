const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  // Buscar o produto Camiseta Básica Premium do vendedor
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'Camiseta Básica Premium' },
      isDropshipping: true,
      sellerId: { not: null }
    },
    select: { 
      id: true, 
      name: true, 
      price: true, 
      active: true, 
      supplierSku: true,
      seller: { select: { storeName: true } }
    }
  });
  
  if (!product) {
    console.log('Produto não encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n📋 PRODUTO DO VENDEDOR:');
  console.log('   ID:', product.id);
  console.log('   Nome:', product.name);
  console.log('   Preço:', product.price);
  console.log('   Ativo:', product.active);
  console.log('   SupplierSku:', product.supplierSku);
  console.log('   Vendedor:', product.seller?.storeName);
  
  if (product.supplierSku) {
    const sourceProduct = await prisma.product.findUnique({
      where: { id: product.supplierSku },
      select: { id: true, name: true, price: true, active: true }
    });
    
    console.log('\n📋 PRODUTO ORIGINAL (ADM):');
    if (sourceProduct) {
      console.log('   ID:', sourceProduct.id);
      console.log('   Nome:', sourceProduct.name);
      console.log('   Preço:', sourceProduct.price);
      console.log('   Ativo:', sourceProduct.active);
      
      console.log('\n⚠️ VALIDAÇÃO:');
      console.log('   Preço vendedor:', product.price);
      console.log('   Preço mínimo:', sourceProduct.price);
      console.log('   Diferença:', (product.price - sourceProduct.price).toFixed(2));
      
      if (product.price < sourceProduct.price) {
        console.log('   ❌ PREÇO ABAIXO DO MÍNIMO - NÃO PODE ATIVAR');
      } else {
        console.log('   ✅ Preço válido');
      }
    } else {
      console.log('   ❌ Produto original não encontrado!');
    }
  }
  
  await prisma.$disconnect();
}

checkProduct();
