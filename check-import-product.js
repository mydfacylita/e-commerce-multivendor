const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  // Buscar produto pelo nome (Processador Manual)
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'Processador Manual' } },
    include: { 
      supplier: true,
      category: {
        include: {
          parent: {
            include: {
              parent: true
            }
          }
        }
      }
    }
  });

  if (!product) {
    console.log('Produto não encontrado');
    await prisma.$disconnect();
    return;
  }

  console.log('=== PRODUTO ===');
  console.log('Nome:', product.name);
  console.log('Preço:', product.price);
  console.log('');
  console.log('=== CATEGORIA ===');
  console.log('Categoria:', product.category?.name, '| slug:', product.category?.slug);
  console.log('Pai:', product.category?.parent?.name, '| slug:', product.category?.parent?.slug);
  console.log('Avô:', product.category?.parent?.parent?.name);
  console.log('');
  console.log('=== FORNECEDOR ===');
  console.log('Fornecedor:', product.supplier?.name);
  console.log('SupplierUrl:', product.supplierUrl);
  console.log('SupplierSku:', product.supplierSku);
  console.log('');
  
  // Verificar lógica
  const isImportedCategory = (
    product.category?.slug === 'importados' ||
    product.category?.name?.toLowerCase() === 'importados' ||
    product.category?.parent?.slug === 'importados' ||
    product.category?.parent?.name?.toLowerCase() === 'importados' ||
    product.category?.parent?.parent?.slug === 'importados'
  );
  
  const supplierName = product.supplier?.name?.toLowerCase() || '';
  const supplierUrl = product.supplierUrl?.toLowerCase() || '';
  const isInternationalSupplier = (
    supplierName.includes('aliexpress') || supplierUrl.includes('aliexpress.com') ||
    supplierName.includes('shopee') || supplierUrl.includes('shopee.com') ||
    supplierName.includes('amazon') || supplierUrl.includes('amazon.com')
  );
  
  console.log('=== RESULTADO ===');
  console.log('É categoria Importados?', isImportedCategory);
  console.log('É fornecedor internacional?', isInternationalSupplier);
  console.log('DEVERIA SER FRETE INTERNACIONAL?', isImportedCategory && isInternationalSupplier);
  
  await prisma.$disconnect();
}

checkProduct();
