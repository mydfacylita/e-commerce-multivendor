const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO' }
    })
    
    console.log('Gateway encontrado:')
    console.log('ID:', gateway.id)
    console.log('Gateway:', gateway.gateway)
    console.log('isActive:', gateway.isActive)
    console.log('Config type:', typeof gateway.config)
    console.log('Config keys:', Object.keys(gateway.config))
    console.log('Config completo:', JSON.stringify(gateway.config, null, 2))
    
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
