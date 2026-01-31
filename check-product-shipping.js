const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Verificar fornecedor
  const supplier = await p.supplier.findFirst({
    where: { name: { contains: 'AliExpress' } }
  })
  console.log('==== FORNECEDOR ALIEXPRESS ====')
  console.log('ID:', supplier?.id)
  console.log('Nome:', supplier?.name)
  console.log('Type:', supplier?.type)
  console.log('')
  
  const prod = await p.product.findFirst({
    where: { name: { contains: 'Processador Manual Triturador' } },
    include: { 
      supplier: true, 
      category: { include: { parent: true } } 
    }
  })
  
  console.log('==== DADOS DO PRODUTO ====')
  console.log('Produto:', prod?.name)
  console.log('ID:', prod?.id)
  console.log('')
  console.log('=== CATEGORIA ===')
  console.log('Categoria:', prod?.category?.name, 'slug:', prod?.category?.slug)
  console.log('Categoria Pai:', prod?.category?.parent?.name, 'slug:', prod?.category?.parent?.slug)
  console.log('')
  console.log('=== FORNECEDOR ===')
  console.log('Supplier ID:', prod?.supplierId)
  console.log('Supplier:', prod?.supplier?.name)
  console.log('Supplier Type:', prod?.supplier?.type)
  console.log('supplierUrl:', prod?.supplierUrl)
  console.log('supplierSku:', prod?.supplierSku)
  console.log('shipFromCountry:', prod?.shipFromCountry)
  console.log('')
  console.log('=== FLAGS ===')
  console.log('isDropshipping:', prod?.isDropshipping)
  console.log('')
  
  await p.$disconnect()
}

main()
