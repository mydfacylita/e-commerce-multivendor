import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixOrder() {
  const orderId = 'cmk4yx0lu0003oeqg93yesg52'
  
  console.log('🔧 Corrigindo pedido...')
  
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PROCESSING',
      paymentStatus: 'APPROVED'
    }
  })
  
  console.log('✅ Pedido atualizado para PROCESSING!')
  
  // Verificar itens e calcular comissões
  const pedido = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true
    }
  })
  
  console.log('\n📦 Itens do pedido:')
  for (const item of pedido!.items) {
    console.log(`   - ${item.name}: R$ ${item.price} x ${item.quantity}`)
    console.log(`     Seller ID: ${item.sellerId}`)
    console.log(`     Comissão: R$ ${item.sellerCommission || 0}`)
  }
  
  await prisma.$disconnect()
}

fixOrder()
