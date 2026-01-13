import prisma from '../lib/prisma'
import { MercadoPagoConfig, Payment } from 'mercadopago'

async function syncPendingPayments() {
  console.log('🔍 Buscando pedidos pendentes...')

  const pedidosPendentes = await prisma.order.findMany({
    where: {
      paymentStatus: { in: ['PENDING', 'IN_PROCESS'] },
      paymentId: { not: null }
    },
    select: {
      id: true,
      orderNumber: true,
      paymentId: true,
      paymentStatus: true,
      status: true,
      total: true
    }
  })

  console.log(`📦 Encontrados ${pedidosPendentes.length} pedidos pendentes`)

  if (pedidosPendentes.length === 0) {
    console.log('✅ Nenhum pedido pendente!')
    return
  }

  // Buscar configuração do Mercado Pago
  const mpConfig = await prisma.paymentGateway.findFirst({
    where: { gateway: 'MERCADOPAGO', isActive: true }
  })

  if (!mpConfig) {
    console.error('❌ Mercado Pago não configurado!')
    return
  }

  const config = mpConfig.config as any
  const client = new MercadoPagoConfig({ 
    accessToken: config.accessToken,
    options: { timeout: 5000 }
  })
  const paymentClient = new Payment(client)

  for (const pedido of pedidosPendentes) {
    console.log(`\n🔄 Verificando pedido ${pedido.orderNumber} (${pedido.id})...`)
    console.log(`   Payment ID: ${pedido.paymentId}`)

    try {
      const payment = await paymentClient.get({ id: Number(pedido.paymentId) })
      
      console.log(`   Status MP: ${payment.status}`)
      console.log(`   Status Detail: ${payment.status_detail}`)

      if (payment.status === 'approved') {
        console.log('   ✅ APROVADO! Atualizando banco...')
        
        await prisma.order.update({
          where: { id: pedido.id },
          data: {
            status: 'APPROVED',
            paymentStatus: 'APPROVED'
          }
        })

        console.log('   ✅ Pedido atualizado com sucesso!')
      } else {
        console.log(`   ⏳ Ainda pendente: ${payment.status}`)
      }

    } catch (error: any) {
      console.error(`   ❌ Erro ao verificar: ${error.message}`)
    }
  }

  console.log('\n✅ Sincronização concluída!')
}

syncPendingPayments()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
