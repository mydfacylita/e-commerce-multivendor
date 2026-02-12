const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findPendingAffiliateSales() {
  try {
    console.log('🔍 Buscando TODAS as vendas de afiliado com status PENDING...\n')
    
    const pendingSales = await prisma.affiliateSale.findMany({
      where: { 
        status: 'PENDING'
      },
      include: {
        affiliate: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 Encontradas ${pendingSales.length} vendas PENDING\n`)
    
    for (const sale of pendingSales) {
      console.log(`${'='.repeat(80)}`)
      console.log(`💰 AffiliateSale ID: ${sale.id}`)
      console.log(`📦 Pedido ID: ${sale.orderId}`)
      console.log(`👤 Afiliado: ${sale.affiliate.name} (${sale.affiliate.code})`)
      console.log(`💵 Comissão: R$ ${sale.commissionAmount.toFixed(2)}`)
      console.log(`📅 Criada em: ${sale.createdAt.toLocaleString('pt-BR')}`)
      console.log(`⏰ Status: ${sale.status}`)
      
      // Verificar se o pedido existe
      const order = await prisma.order.findUnique({
        where: { id: sale.orderId },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          deliveredAt: true,
          total: true
        }
      })
      
      if (order) {
        console.log(`\n✅ PEDIDO ENCONTRADO:`)
        console.log(`  Status: ${order.status}`)
        console.log(`  Pagamento: ${order.paymentStatus || 'N/A'}`)
        console.log(`  Total: R$ ${order.total.toFixed(2)}`)
        console.log(`  Entregue: ${order.deliveredAt ? order.deliveredAt.toLocaleString('pt-BR') : '❌ NÃO'}`)
        
        if (order.status === 'DELIVERED') {
          console.log(`\n⚠️  PROBLEMA CRÍTICO: Pedido está DELIVERED mas AffiliateSale está PENDING!`)
          console.log(`  ❌ processAffiliateCommission() NÃO foi chamada para este pedido!`)
        }
      } else {
        console.log(`\n❌ PEDIDO NÃO EXISTE NO BANCO!`)
        console.log(`  ⚠️  PROBLEMA: AffiliateSale aponta para pedido inexistente`)
        console.log(`  🗑️  Possível pedido deletado ou ID incorreto`)
      }
      console.log(``)
    }
    
    // Buscar também vendas DELIVERED recentes
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔍 Verificando pedidos DELIVERED com AffiliateSale...\n`)
    
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        affiliateId: { not: null }
      },
      include: {
        affiliateSale: true
      },
      orderBy: { deliveredAt: 'desc' },
      take: 10
    })
    
    console.log(`📦 Encontrados ${deliveredOrders.length} pedidos DELIVERED com afiliado\n`)
    
    for (const order of deliveredOrders) {
      console.log(`Pedido: ${order.id}`)
      console.log(`  Status: ${order.status}`)
      console.log(`  Entregue: ${order.deliveredAt?.toLocaleString('pt-BR')}`)
      
      if (order.affiliateSale) {
        console.log(`  AffiliateSale: ${order.affiliateSale.status} (ID: ${order.affiliateSale.id})`)
        if (order.affiliateSale.status !== 'CONFIRMED' && order.affiliateSale.status !== 'PAID') {
          console.log(`  ⚠️  ALERTA: Status inconsistente!`)
        }
      } else {
        console.log(`  ❌ SEM AffiliateSale`)
      }
      console.log(``)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

findPendingAffiliateSales()
