const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  const items = await prisma.orderItem.findMany({
    where: { sellerId: 'cmk4hal6j0009cxgjq662ziwc' },
    select: {
      id: true,
      price: true,
      quantity: true,
      sellerRevenue: true,
      commissionAmount: true,
      itemType: true,
      product: {
        select: { name: true, supplierSku: true }
      }
    }
  })

  console.log('\n=== ORDER ITEMS DO VENDEDOR ===\n')
  let totalRevenue = 0
  let totalCommission = 0
  
  items.forEach(i => {
    const isDropship = !!i.product?.supplierSku
    console.log(`${isDropship ? 'DROP' : 'STOCK'} | ${i.product?.name?.slice(0, 25).padEnd(25)} | R$${i.price.toFixed(2)} x ${i.quantity} | Revenue: R$${(i.sellerRevenue || 0).toFixed(2)} | Commission: R$${(i.commissionAmount || 0).toFixed(2)}`)
    totalRevenue += i.sellerRevenue || 0
    totalCommission += i.commissionAmount || 0
  })
  
  console.log('\n--- TOTAIS ---')
  console.log('Total Revenue:', totalRevenue.toFixed(2))
  console.log('Total Commission:', totalCommission.toFixed(2))

  await prisma.$disconnect()
}

check()
