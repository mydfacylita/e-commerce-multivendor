const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function forceCheckPayment() {
  try {
    console.log('🔍 Forçando verificação do pagamento 141204835698...\n')

    // 1. Buscar o pedido no banco
    const order = await prisma.order.findFirst({
      where: {
        paymentId: '141204835698'
      },
      select: {
        id: true,
        status: true,
        paymentId: true,
        paymentStatus: true,
        total: true,
        createdAt: true
      }
    })

    if (!order) {
      console.log('❌ Pedido não encontrado no banco!')
      return
    }

    console.log('📦 Pedido encontrado:')
    console.log(JSON.stringify(order, null, 2))
    console.log('')

    // 2. Buscar credenciais do Mercado Pago
    const gateway = await prisma.paymentGateway.findFirst({
      where: {
        gateway: 'MERCADOPAGO',
        isActive: true
      }
    })

    if (!gateway) {
      console.log('❌ Gateway não encontrado!')
      return
    }

    let config = gateway.config
    if (typeof config === 'string') {
      config = JSON.parse(config)
    }

    console.log('🔑 Token:', config.accessToken?.substring(0, 20) + '...')
    console.log('🌐 Ambiente:', config.environment)
    console.log('')

    // 3. Consultar no Mercado Pago
    const apiUrl = 'https://api.mercadopago.com'
    const response = await fetch(`${apiUrl}/v1/payments/${order.paymentId}`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    })

    console.log(`📥 Status HTTP: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Erro:', errorText)
      return
    }

    const payment = await response.json()

    console.log('✅ Resposta do Mercado Pago:')
    console.log(JSON.stringify({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method_id: payment.payment_method_id,
      transaction_amount: payment.transaction_amount,
      date_created: payment.date_created,
      date_approved: payment.date_approved
    }, null, 2))
    console.log('')

    // 4. Atualizar pedido se aprovado
    if (payment.status === 'approved') {
      console.log('🎉 PAGAMENTO APROVADO! Atualizando pedido...')
      
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PROCESSING',
          paymentStatus: 'approved',
          paymentApprovedAt: new Date(payment.date_approved || new Date())
        }
      })

      console.log('✅ Pedido atualizado para PROCESSING!')
    } else {
      console.log(`⏳ Pagamento ainda está: ${payment.status} (${payment.status_detail})`)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

forceCheckPayment()
