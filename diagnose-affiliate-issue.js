const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSpecificOrders() {
  try {
    // IDs dos pedidos da dashboard do afiliado
    const orderIds = [
      'cmljja6s8001oatdcfasda6',
      'cmljja020006b0d338plwbrz',
      'cmljja718003jy71rqfngw9ky'
    ]
    
    console.log('🔍 Verificando pedidos específicos da dashboard...\n')
    
    for (const orderId of orderIds) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`📦 Pedido: ${orderId}`)
      console.log(`${'='.repeat(80)}`)
      
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          affiliateSale: {
            include: {
              affiliate: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          }
        }
      })

      if (!order) {
        console.log(`❌ Pedido não encontrado!\n`)
        continue
      }

      console.log(`\n📊 DADOS DO PEDIDO:`)
      console.log(`  Status: ${order.status}`)
      console.log(`  Total: R$ ${order.total.toFixed(2)}`)
      console.log(`  Pagamento: ${order.paymentStatus || 'Não informado'}`)
      console.log(`  Criado em: ${order.createdAt.toLocaleString('pt-BR')}`)
      console.log(`  Entregue em: ${order.deliveredAt ? order.deliveredAt.toLocaleString('pt-BR') : '❌ NÃO ENTREGUE'}`)
      console.log(`  Afiliado ID: ${order.affiliateId || '❌ Sem afiliado'}`)
      console.log(`  Código Afiliado: ${order.affiliateCode || '❌ Sem código'}`)

      if (order.affiliateSale) {
        console.log(`\n💰 DADOS DA VENDA DE AFILIADO:`)
        console.log(`  ID: ${order.affiliateSale.id}`)
        console.log(`  Status: ${order.affiliateSale.status}`)
        console.log(`  Comissão: R$ ${order.affiliateSale.commissionAmount.toFixed(2)}`)
        console.log(`  Taxa: ${order.affiliateSale.commissionRate}%`)
        console.log(`  Confirmada em: ${order.affiliateSale.confirmedAt ? order.affiliateSale.confirmedAt.toLocaleString('pt-BR') : '❌ NÃO CONFIRMADA'}`)
        console.log(`  Disponível em: ${order.affiliateSale.availableAt ? order.affiliateSale.availableAt.toLocaleString('pt-BR') : '❌ SEM DATA'}`)
        console.log(`  Afiliado: ${order.affiliateSale.affiliate.name} (${order.affiliateSale.affiliate.code})`)
        
        // DIAGNÓSTICO
        console.log(`\n🔍 DIAGNÓSTICO:`)
        if (order.status === 'DELIVERED' && order.affiliateSale.status === 'PENDING') {
          console.log(`  ⚠️  PROBLEMA: Pedido DELIVERED mas comissão PENDING`)
          console.log(`  ❌ A função processAffiliateCommission() NÃO foi chamada!`)
        } else if (order.affiliateSale.status === 'CONFIRMED') {
          console.log(`  ✅ Status correto - Comissão confirmada`)
        } else {
          console.log(`  ❓ Status: ${order.affiliateSale.status}`)
        }
      } else {
        console.log(`\n❌ SEM AFFILIATE_SALE`)
        console.log(`  ⚠️  PROBLEMA: Pedido tem affiliateId mas não tem registro na tabela`)
      }
    }
    
    console.log(`\n${'='.repeat(80)}`)
    console.log('🎯 ANÁLISE DO FLUXO:\n')
    console.log('Quando processAffiliateCommission() DEVERIA ser chamada:')
    console.log('  1. ✅ Quando pedido é marcado como DELIVERED')
    console.log('  2. ✅ No webhook de entrega')
    console.log('  3. ✅ No job sync-order-tracking quando atualiza para DELIVERED\n')
    
    console.log('Locais para verificar:')
    console.log('  - app/api/admin/entregas/[id]/route.ts')
    console.log('  - app/api/webhooks/order-status/route.ts')
    console.log('  - app/api/jobs/sync-order-tracking/route.ts')
    console.log('  - lib/affiliate-commission.ts\n')
    
  } catch (error) {
    console.error('Erro:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

checkSpecificOrders()
