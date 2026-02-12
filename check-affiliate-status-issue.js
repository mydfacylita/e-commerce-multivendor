const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAffiliateSaleStatus() {
  try {
    console.log('🔍 Verificando pedidos de afiliados recentes...\n')
    
    const orders = await prisma.order.findMany({
      where: {
        id: {
          startsWith: 'cmljja'
        }
      },
      include: {
        affiliateSale: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    for (const order of orders) {
      console.log(`Pedido: ${order.id}`)
      console.log(`  Status Pedido: ${order.status}`)
      console.log(`  Pagamento: ${order.paymentStatus}`)
      console.log(`  Entregue em: ${order.deliveredAt ? order.deliveredAt.toLocaleString('pt-BR') : 'Não entregue'}`)
      console.log(`  Afiliado ID: ${order.affiliateId || 'Não tem'}`)
      
      if (order.affiliateSale) {
        console.log(`  ✅ AffiliateSale encontrada:`)
        console.log(`     ID: ${order.affiliateSale.id}`)
        console.log(`     Status: ${order.affiliateSale.status}`)
        console.log(`     Confirmada em: ${order.affiliateSale.confirmedAt ? order.affiliateSale.confirmedAt.toLocaleString('pt-BR') : 'Não confirmada'}`)
        console.log(`     Disponível em: ${order.affiliateSale.availableAt ? order.affiliateSale.availableAt.toLocaleString('pt-BR') : 'Sem data'}`)
        console.log(`     Comissão: R$ ${order.affiliateSale.commissionAmount.toFixed(2)}`)
        
        // Verificar inconsistência
        if (order.status === 'DELIVERED' && order.affiliateSale.status === 'PENDING') {
          console.log(`  ⚠️ PROBLEMA ENCONTRADO: Pedido entregue mas comissão ainda PENDING`)
        }
      } else {
        console.log(`  ❌ Não tem AffiliateSale`)
      }
      console.log('')
    }
    
  } catch (error) {
    console.error('Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAffiliateSaleStatus()
