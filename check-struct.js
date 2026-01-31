const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function deleteProduct() {
  const r = await p.product.findFirst({ 
    where: { supplierSku: '1005008496972052' }
  })
  
  if (r) {
    await p.product.delete({ where: { id: r.id } })
    console.log('Produto deletado:', r.id)
  } else {
    console.log('Produto não encontrado')
  }
  
  await p.$disconnect()
}

deleteProduct()
