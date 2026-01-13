// Testa se as configurações de pagamento estão corretas
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPaymentConfig() {
  console.log('\n🔍 Verificando configuração de pagamento...\n')
  
  // 1. Verificar gateway ativo
  const gateway = await prisma.paymentGateway.findFirst({
    where: { isActive: true }
  })
  
  if (!gateway) {
    console.error('❌ Nenhum gateway de pagamento ativo!')
    return
  }
  
  console.log('✅ Gateway encontrado:', gateway.gateway)
  console.log('   ID:', gateway.id)
  console.log('   Ativo:', gateway.isActive)
  
  // 2. Verificar config
  let config = gateway.config
  if (typeof config === 'string') {
    config = JSON.parse(config)
  }
  
  console.log('\n🔑 Configurações:')
  console.log('   Access Token:', config.accessToken ? config.accessToken.substring(0, 30) + '...' : 'NÃO CONFIGURADO')
  console.log('   Public Key:', config.publicKey || 'NÃO CONFIGURADO')
  console.log('   Ambiente:', config.environment || 'NÃO CONFIGURADO')
  
  // 3. Verificar pedidos pendentes
  const pendingOrders = await prisma.order.findMany({
    where: { status: 'PENDING' },
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: { 
      id: true, 
      total: true,
      buyerName: true,
      buyerCpf: true,
      paymentId: true,
      paymentStatus: true
    }
  })
  
  console.log('\n📦 Pedidos pendentes (últimos 3):')
  if (pendingOrders.length === 0) {
    console.log('   Nenhum pedido pendente')
  } else {
    pendingOrders.forEach(order => {
      console.log(`   - ${order.id.substring(0, 12)}... | R$ ${order.total} | CPF: ${order.buyerCpf ? '✓' : '✗'} | PaymentID: ${order.paymentId || 'N/A'}`)
    })
  }
  
  console.log('\n✅ Verificação concluída!')
}

checkPaymentConfig()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
