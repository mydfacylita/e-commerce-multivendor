const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    // Buscar pedidos aprovados
    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'approved' },
      select: {
        id: true,
        parentOrderId: true,
        paymentId: true,
        total: true,
        buyerName: true,
        items: {
          select: {
            id: true,
            itemType: true,
            price: true,
            quantity: true,
            product: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    
    console.log('=== PEDIDOS APROVADOS ===\n')
    
    // Agrupar por paymentId
    const byPaymentId = {}
    orders.forEach(o => {
      if (!byPaymentId[o.paymentId]) {
        byPaymentId[o.paymentId] = []
      }
      byPaymentId[o.paymentId].push(o)
    })
    
    for (const [paymentId, pedidos] of Object.entries(byPaymentId)) {
      console.log(`\n📦 Payment ID: ${paymentId}`)
      console.log(`   Qtd Pedidos: ${pedidos.length}`)
      
      pedidos.forEach((p, i) => {
        console.log(`\n   Pedido ${i + 1}: ${p.id}`)
        console.log(`   ParentOrderId: ${p.parentOrderId || 'N/A'}`)
        console.log(`   Total: R$ ${p.total.toFixed(2)}`)
        console.log(`   Cliente: ${p.buyerName}`)
        console.log(`   Itens:`)
        p.items.forEach((item, j) => {
          console.log(`      ${j + 1}. [${item.itemType}] ${item.product?.name || 'Sem nome'} - R$ ${item.price} x ${item.quantity}`)
        })
      })
    }
    
    // Identificar problemas
    console.log('\n\n=== ANÁLISE ===')
    let problematicos = 0
    for (const [paymentId, pedidos] of Object.entries(byPaymentId)) {
      if (pedidos.length > 1) {
        problematicos++
        console.log(`\n⚠️  PaymentId ${paymentId} tem ${pedidos.length} pedidos separados!`)
        const hasHybrid = pedidos.some(p => p.parentOrderId)
        console.log(`   É híbrido: ${hasHybrid ? 'SIM' : 'NÃO'}`)
        if (hasHybrid) {
          const parentId = pedidos.find(p => p.parentOrderId)?.parentOrderId
          console.log(`   ParentOrderId: ${parentId}`)
        }
      }
    }
    
    if (problematicos === 0) {
      console.log('\n✅ Nenhum problema encontrado - todos pagamentos têm apenas 1 pedido')
    } else {
      console.log(`\n⚠️  ${problematicos} pagamento(s) com múltiplos pedidos`)
    }
    
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
