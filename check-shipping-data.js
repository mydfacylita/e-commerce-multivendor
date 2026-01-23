const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  // Verificar pedido com etiqueta
  const order = await p.order.findFirst({ 
    where: { shippingLabel: { not: null } }, 
    select: { 
      id: true, 
      shippingCost: true, 
      shippingLabel: true, 
      shippingLabelType: true, 
      shippingCarrier: true, 
      shippingService: true, 
      shippingMethod: true 
    } 
  })
  
  console.log('Order com etiqueta:')
  if (order) {
    console.log({
      ...order,
      shippingLabel: order.shippingLabel ? order.shippingLabel.substring(0, 100) + '...' : null
    })
  } else {
    console.log('Nenhum pedido com etiqueta encontrado')
  }
  
  // Verificar um pedido específico para ver todos os campos de shipping
  const sample = await p.order.findFirst({
    select: {
      id: true,
      shippingCost: true,
      shippingCarrier: true,
      shippingService: true,
      shippingMethod: true,
      shippingLabelType: true,
      deliveryDays: true,
      total: true
    }
  })
  console.log('\nSample order shipping fields:')
  console.log(sample)
  
  await p.$disconnect()
}

check()
