const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Importar a função de processamento
async function processAffiliateCommission(orderId) {
  try {
    console.log(`\n🔄 Processando comissão do pedido: ${orderId}`)
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        affiliateId: true,
        deliveredAt: true
      }
    })

    if (!order) {
      return { success: false, message: 'Pedido não encontrado' }
    }

    if (!order.affiliateId) {
      return { success: false, message: 'Pedido não tem afiliado' }
    }

    if (order.status !== 'DELIVERED') {
      return { success: false, message: `Pedido não está entregue (Status: ${order.status})` }
    }

    const affiliateSale = await prisma.affiliateSale.findFirst({
      where: { orderId: order.id }
    })

    if (!affiliateSale) {
      return { success: false, message: 'Venda de afiliado não encontrada' }
    }

    if (affiliateSale.status === 'CONFIRMED' || affiliateSale.status === 'PAID') {
      return { success: false, message: `Comissão já processada (Status: ${affiliateSale.status})` }
    }

    // Calcular data de disponibilidade (7 dias após entrega)
    const availableAt = new Date()
    availableAt.setDate(availableAt.getDate() + 7)

    await prisma.affiliateSale.update({
      where: { id: affiliateSale.id },
      data: {
        status: 'CONFIRMED',
        availableAt: availableAt
      }
    })

    console.log(`   ✅ Comissão confirmada!`)
    console.log(`   💰 Valor: R$ ${affiliateSale.commissionAmount.toFixed(2)}`)
    console.log(`   📅 Disponível em: ${availableAt.toLocaleString('pt-BR')}`)

    return {
      success: true,
      message: 'Comissão confirmada com sucesso',
      affiliateSaleId: affiliateSale.id,
      amount: affiliateSale.commissionAmount,
      availableAt: availableAt
    }
  } catch (error) {
    console.error(`   ❌ Erro:`, error.message)
    return { success: false, message: error.message }
  }
}

async function fixPendingSales() {
  try {
    console.log('🔧 Corrigindo vendas de afiliado pendentes...\n')
    
    // Buscar vendas PENDING com pedidos DELIVERED
    const pendingSales = await prisma.affiliateSale.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            deliveredAt: true
          }
        }
      }
    })

    console.log(`📊 Encontradas ${pendingSales.length} vendas PENDING\n`)

    let fixed = 0
    let skipped = 0

    for (const sale of pendingSales) {
      console.log(`${'='.repeat(80)}`)
      console.log(`💰 AffiliateSale: ${sale.id}`)
      console.log(`📦 Pedido: ${sale.orderId}`)
      console.log(`   Status Pedido: ${sale.order?.status || 'N/A'}`)
      console.log(`   Entregue em: ${sale.order?.deliveredAt?.toLocaleString('pt-BR') || 'N/A'}`)

      if (sale.order?.status === 'DELIVERED') {
        const result = await processAffiliateCommission(sale.orderId)
        
        if (result.success) {
          fixed++
        } else {
          console.log(`   ⚠️  ${result.message}`)
          skipped++
        }
      } else {
        console.log(`   ⏭️  Pulando - Pedido ainda não foi entregue`)
        skipped++
      }
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`✅ CONCLUÍDO!`)
    console.log(`   Total: ${pendingSales.length}`)
    console.log(`   ✅ Corrigidas: ${fixed}`)
    console.log(`   ⏭️  Puladas: ${skipped}`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

fixPendingSales()
