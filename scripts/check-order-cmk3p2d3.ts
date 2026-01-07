import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Buscar pedido específico
  const orderId = 'cmk3p2d3y0005mpbdndwczpsp' // Pedido #cmk3p2d3
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })

  if (!order) {
    console.log('❌ Pedido não encontrado')
    return
  }

  console.log('📋 PEDIDO #cmk3p2d3')
  console.log('ID Completo:', order.id)
  console.log('Status:', order.status)
  console.log('Total:', order.total)
  console.log('Comprador:', order.buyerName)
  console.log('\n===== ITENS =====\n')

  order.items.forEach((item, index) => {
    console.log(`Item ${index + 1}:`)
    console.log('  Produto:', item.product.name)
    console.log('  Preço unitário: R$', item.price)
    console.log('  Quantidade:', item.quantity)
    console.log('  Total: R$', (item.price * item.quantity).toFixed(2))
    console.log('  Seller ID:', item.sellerId)
    console.log('  Supplier SKU:', item.product.supplierSku || '❌ NÃO TEM')
    console.log('  Cost Price: R$', item.product.costPrice || 0)
    console.log('  Commission Rate:', item.commissionRate + '%')
    console.log('  Commission Amount: R$', item.commissionAmount?.toFixed(2) || '0.00')
    console.log('  Seller Revenue: R$', item.sellerRevenue?.toFixed(2) || '0.00')
    console.log('  É Dropshipping?', item.product.supplierSku ? '✅ SIM' : '❌ NÃO')
    console.log('\n')
  })

  // Calcular análise
  const totalVenda = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const custoBase = order.items.reduce((sum, item) => sum + ((item.product.costPrice || 0) * item.quantity), 0)
  const comissaoTotal = order.items.reduce((sum, item) => sum + (item.commissionAmount || 0), 0)
  const lucroLiquido = totalVenda - custoBase - comissaoTotal

  console.log('===== CÁLCULO DROPSHIPPING =====')
  console.log('Receita Drop: R$', totalVenda.toFixed(2))
  console.log('Custo Base: R$', custoBase.toFixed(2))
  console.log('Comissão Plataforma: R$', comissaoTotal.toFixed(2))
  console.log('Lucro Líquido: R$', lucroLiquido.toFixed(2))
  console.log('Margem:', ((lucroLiquido / totalVenda) * 100).toFixed(1) + '%')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
