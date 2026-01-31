const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const suppliers = await prisma.supplier.findMany()
  console.log('=== FORNECEDORES ===')
  console.log(JSON.stringify(suppliers, null, 2))
  
  // Verificar produtos com fornecedor
  const productsWithSupplier = await prisma.product.findMany({
    where: { supplierId: { not: null } },
    select: {
      id: true,
      name: true,
      supplierId: true,
      supplierSku: true,
      origem: true,
      supplier: {
        select: { name: true, type: true }
      }
    },
    take: 5
  })
  console.log('\n=== PRODUTOS COM FORNECEDOR (5 primeiros) ===')
  console.log(JSON.stringify(productsWithSupplier, null, 2))
}

main().finally(() => prisma.$disconnect())
