import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateMercadoLivreOrders() {
  console.log('🔄 Atualizando pedidos do Mercado Livre...')

  // Buscar token do ML
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    include: { mercadoLivreAuth: true },
  })

  if (!adminUser?.mercadoLivreAuth) {
    console.error('❌ Autenticação ML não encontrada')
    return
  }

  const mlAuth = adminUser.mercadoLivreAuth

  if (mlAuth.expiresAt < new Date()) {
    console.error('❌ Token ML expirado')
    return
  }

  // Buscar todos os pedidos do ML sem CPF ou telefone
  const orders = await prisma.order.findMany({
    where: {
      marketplaceName: 'Mercado Livre',
      OR: [
        { buyerCpf: null },
        { buyerPhone: null },
      ],
    },
  })

  console.log(`📦 Encontrados ${orders.length} pedidos para atualizar`)

  for (const order of orders) {
    try {
      console.log(`\n🔍 Processando pedido ${order.marketplaceOrderId}...`)

      // Buscar detalhes do pedido
      const orderResponse = await fetch(
        `https://api.mercadolibre.com/orders/${order.marketplaceOrderId}`,
        { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
      )

      if (!orderResponse.ok) {
        console.error(`❌ Erro ao buscar pedido: ${orderResponse.status}`)
        continue
      }

      const orderDetail = await orderResponse.json()

      // Buscar CPF
      let buyerCpf = order.buyerCpf
      if (!buyerCpf && orderDetail.buyer?.id) {
        const buyerResponse = await fetch(
          `https://api.mercadolibre.com/users/${orderDetail.buyer.id}`,
          { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
        )

        if (buyerResponse.ok) {
          const buyerData = await buyerResponse.json()
          buyerCpf = buyerData.identification?.number || null
          console.log(`  CPF: ${buyerCpf || 'não disponível'}`)
        }
      }

      // Buscar telefone
      let buyerPhone = order.buyerPhone
      if (!buyerPhone && orderDetail.shipping?.id) {
        const shipmentResponse = await fetch(
          `https://api.mercadolibre.com/shipments/${orderDetail.shipping.id}`,
          { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
        )

        if (shipmentResponse.ok) {
          const shipmentData = await shipmentResponse.json()
          buyerPhone = shipmentData.receiver_address?.receiver_phone || null
          console.log(`  Telefone: ${buyerPhone || 'não disponível'}`)
        }
      }

      // Atualizar pedido se houver novos dados
      if (buyerCpf || buyerPhone) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            ...(buyerCpf && { buyerCpf }),
            ...(buyerPhone && { buyerPhone }),
          },
        })
        console.log(`  ✅ Pedido atualizado!`)
      } else {
        console.log(`  ⏭️ Sem dados novos para atualizar`)
      }

      // Delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`  ❌ Erro ao processar pedido ${order.marketplaceOrderId}:`, error)
    }
  }

  console.log('\n✅ Atualização concluída!')
}

updateMercadoLivreOrders()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error)
    prisma.$disconnect()
    process.exit(1)
  })
