import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sellerId = 'cmk3bd6vb0002w0bioke9h4ps'
  
  console.log('🔍 Verificando produtos do vendedor:', sellerId)
  console.log('---\n')
  
  const products = await prisma.product.findMany({
    where: { sellerId },
    select: {
      id: true,
      name: true,
      price: true,
      costPrice: true,
      supplierSku: true,
      stock: true,
    }
  })

  console.log('📦 Total de Produtos:', products.length)
  console.log('\n')
  
  products.forEach((product, index) => {
    console.log(`--- Produto ${index + 1} ---`)
    console.log('ID:', product.id)
    console.log('Nome:', product.name)
    console.log('Preço: R$', product.price)
    console.log('Custo: R$', product.costPrice || 0)
    console.log('Supplier SKU:', product.supplierSku || '❌ NÃO TEM (Produto Normal)')
    console.log('Estoque:', product.stock)
    console.log('É Dropshipping?', product.supplierSku ? '✅ SIM' : '❌ NÃO')
    console.log('\n')
  })

  // Verificar pedidos
  console.log('===== PEDIDOS =====\n')
  
  const orderItems = await prisma.orderItem.findMany({
    where: { sellerId },
    include: { 
      order: true, 
      product: { 
        select: { 
          name: true, 
          supplierSku: true,
          costPrice: true,
        } 
      } 
    },
    orderBy: { createdAt: 'desc' }
  })

  const orderGroups = new Map()

  orderItems.forEach(item => {
    if (!orderGroups.has(item.orderId)) {
      orderGroups.set(item.orderId, {
        id: item.orderId,
        status: item.order.status,
        items: []
      })
    }
    orderGroups.get(item.orderId).items.push(item)
  })

  orderGroups.forEach((orderData, orderId) => {
    const orderTotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const hasDropshipping = orderData.items.some(item => item.product.supplierSku)
    
    console.log(`📋 Pedido: ${orderId}`)
    console.log(`   Status: ${orderData.status}`)
    console.log(`   Total: R$ ${orderTotal.toFixed(2)}`)
    console.log(`   É Dropshipping? ${hasDropshipping ? '✅ SIM' : '❌ NÃO'}`)
    
    orderData.items.forEach(item => {
      console.log(`   - ${item.product.name}`)
      console.log(`     Quantidade: ${item.quantity}`)
      console.log(`     Preço: R$ ${item.price}`)
      console.log(`     Total: R$ ${(item.price * item.quantity).toFixed(2)}`)
      console.log(`     Supplier SKU: ${item.product.supplierSku || '❌ NÃO TEM'}`)
      console.log(`     Cost Price: R$ ${item.product.costPrice || 0}`)
    })
    console.log('\n')
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
