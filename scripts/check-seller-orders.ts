import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sellerId = 'cmk3bd6vb0002w0bioke9h4ps'
  
  console.log('🔍 Consultando OrderItems do vendedor:', sellerId)
  console.log('---\n')
  
  const items = await prisma.orderItem.findMany({
    where: { sellerId },
    include: { 
      order: true, 
      product: { 
        select: { 
          name: true, 
          price: true, 
          costPrice: true, 
          supplierSku: true 
        } 
      } 
    }
  })

  console.log('📦 Total de OrderItems:', items.length)
  console.log('\n')
  
  let totalValue = 0
  const orderIds = new Set()

  items.forEach((item, index) => {
    const itemTotal = item.price * item.quantity
    totalValue += itemTotal
    orderIds.add(item.orderId)
    
    console.log(`--- Item ${index + 1} ---`)
    console.log('OrderItem ID:', item.id)
    console.log('Order ID:', item.orderId)
    console.log('Produto:', item.product.name)
    console.log('Quantidade:', item.quantity)
    console.log('Preço unitário: R$', item.price)
    console.log('Total Item: R$', itemTotal.toFixed(2))
    console.log('Cost Price: R$', item.product.costPrice || 0)
    console.log('Supplier SKU:', item.product.supplierSku || 'Não é dropshipping')
    console.log('Status Pedido:', item.order.status)
    console.log('Commission Rate:', item.commissionRate + '%')
    console.log('Commission Amount: R$', item.commissionAmount?.toFixed(2) || '0.00')
    console.log('Seller Revenue: R$', item.sellerRevenue?.toFixed(2) || '0.00')
    console.log('\n')
  })

  console.log('===== RESUMO =====')
  console.log('Total de Pedidos Únicos:', orderIds.size)
  console.log('Total de Itens:', items.length)
  console.log('Valor Total de Vendas: R$', totalValue.toFixed(2))
  console.log('\n')
  
  console.log('📋 Pedidos únicos:')
  orderIds.forEach(orderId => {
    const orderItems = items.filter(item => item.orderId === orderId)
    const orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    console.log(`- ${orderId}: R$ ${orderTotal.toFixed(2)} (${orderItems.length} itens)`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
