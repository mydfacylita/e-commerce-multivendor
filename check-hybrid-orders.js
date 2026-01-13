const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    // Buscar pedidos híbridos (com parentOrderId)
    const hybridOrders = await prisma.order.findMany({
      where: { 
        parentOrderId: { not: null }
      },
      select: {
        id: true,
        parentOrderId: true,
        paymentId: true,
        paymentStatus: true,
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
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('=== PEDIDOS HÍBRIDOS ===\n')
    
    // Agrupar por parentOrderId
    const byParentId = {}
    hybridOrders.forEach(o => {
      if (!byParentId[o.parentOrderId]) {
        byParentId[o.parentOrderId] = []
      }
      byParentId[o.parentOrderId].push(o)
    })
    
    for (const [parentId, pedidos] of Object.entries(byParentId)) {
      console.log(`\n🔗 Parent Order ID: ${parentId}`)
      console.log(`   Total de sub-pedidos: ${pedidos.length}`)
      
      // Verificar se todos têm o mesmo paymentId
      const paymentIds = [...new Set(pedidos.map(p => p.paymentId))]
      console.log(`   Payment IDs encontrados: ${paymentIds.join(', ') || 'NENHUM'}`)
      
      if (paymentIds.length > 1) {
        console.log(`   ⚠️  PROBLEMA: Múltiplos paymentIds para o mesmo parentOrderId!`)
      } else if (paymentIds.length === 1 && paymentIds[0] === null) {
        console.log(`   ⚠️  PROBLEMA: Nenhum paymentId associado!`)
      }
      
      const valorTotal = pedidos.reduce((sum, p) => sum + p.total, 0)
      console.log(`   Valor total combinado: R$ ${valorTotal.toFixed(2)}`)
      
      pedidos.forEach((p, i) => {
        console.log(`\n   Sub-pedido ${i + 1}: ${p.id}`)
        console.log(`   PaymentId: ${p.paymentId || 'NULL'}`)
        console.log(`   PaymentStatus: ${p.paymentStatus || 'N/A'}`)
        console.log(`   Total: R$ ${p.total.toFixed(2)}`)
        console.log(`   Itens:`)
        p.items.forEach((item, j) => {
          console.log(`      ${j + 1}. [${item.itemType}] ${item.product?.name || 'Sem nome'} - R$ ${item.price} x ${item.quantity}`)
        })
      })
    }
    
    console.log('\n\n=== RESUMO ===')
    console.log(`Total de grupos híbridos: ${Object.keys(byParentId).length}`)
    
    // Verificar problemas
    let problemasPaymentId = 0
    for (const [parentId, pedidos] of Object.entries(byParentId)) {
      const paymentIds = [...new Set(pedidos.map(p => p.paymentId))]
      if (paymentIds.length > 1 || (paymentIds.length === 1 && paymentIds[0] === null)) {
        problemasPaymentId++
      }
    }
    console.log(`Grupos com problema de paymentId: ${problemasPaymentId}`)
    
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
