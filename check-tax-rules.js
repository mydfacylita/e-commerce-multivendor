const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  
  // Buscar última invoice
  const invoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  if (invoice && invoice.xmlAssinado) {
    console.log('=== XML da última NF-e ===');
    console.log(invoice.xmlAssinado.substring(0, 3000));
  } else {
    console.log('Nenhuma invoice com XML encontrada');
  }
  
  await prisma.$disconnect();
})();
