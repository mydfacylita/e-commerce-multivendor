import { PrismaClient } from '@prisma/client'
import { MercadoPagoConfig, Payment } from 'mercadopago'

const prisma = new PrismaClient()

async function checkOrder() {
  const orderId = 'cmk4yx0lu0003oeqg93yesg52' // ID do pedido
  
  console.log(`🔍 Buscando pedido ${orderId}...`)
  
  const pedido = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })

  if (!pedido) {
    console.log('❌ Pedido não encontrado!')
    return
  }

  console.log('\n📦 Pedido:')
  console.log(`   Número: ${pedido.orderNumber}`)
  console.log(`   Status: ${pedido.status}`)
  console.log(`   Payment Status: ${pedido.paymentStatus}`)
  console.log(`   Payment ID: ${pedido.paymentId}`)
  console.log(`   Total: R$ ${pedido.total}`)

  if (pedido.paymentId) {
    console.log('\n🔄 Verificando pagamento no Mercado Pago...')
    
    const mpConfig = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!mpConfig) {
      console.log('❌ MP não configurado')
      return
    }

    const config = mpConfig.config as any
    const client = new MercadoPagoConfig({ accessToken: config.accessToken })
    const paymentClient = new Payment(client)

    try {
      const payment = await paymentClient.get({ id: Number(pedido.paymentId) })
      
      console.log(`\n💳 Status no Mercado Pago: ${payment.status}`)
      console.log(`   Status Detail: ${payment.status_detail}`)
      console.log(`   Valor: R$ ${payment.transaction_amount}`)

      if (payment.status === 'approved') {
        console.log('\n✅ PAGAMENTO APROVADO! Atualizando...')
        
        await prisma.order.update({
          where: { id: pedido.id },
          data: {
            paymentStatus: 'APPROVED'
          }
        })
        
        console.log('✅ Pedido atualizado!')
      }
      
    } catch (error: any) {
      console.error(`❌ Erro: ${error.message}`)
    }
  }
  
  await prisma.$disconnect()
}

checkOrder()
