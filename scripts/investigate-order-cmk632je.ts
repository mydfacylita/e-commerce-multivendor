import { prisma } from '../lib/prisma'

async function investigateOrder() {
  const orderId = 'cmk632jem000niohlajglrz75'
  
  console.log('🔍 INVESTIGANDO PEDIDO:', orderId)
  console.log('='.repeat(80))
  
  // Buscar pedido
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      seller: {
        select: {
          id: true,
          storeName: true,
          balance: true,
          totalEarned: true,
          totalWithdrawn: true
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              costPrice: true
            }
          }
        }
      }
    }
  })

  if (!order) {
    console.log('❌ Pedido não encontrado!')
    return
  }

  console.log('\n📦 INFORMAÇÕES DO PEDIDO:')
  console.log('ID:', order.id)
  console.log('Status:', order.status)
  console.log('Total:', `R$ ${order.total.toFixed(2)}`)
  console.log('Data Criação:', order.createdAt)
  console.log('Pagamento Aprovado:', order.paymentApprovedAt || 'N/A')
  console.log('Parent Order ID:', order.parentOrderId || 'N/A')
  
  console.log('\n👤 CLIENTE:')
  console.log('Nome:', order.user?.name || order.buyerName || 'N/A')
  console.log('Email:', order.user?.email || order.buyerEmail || 'N/A')
  
  if (order.seller) {
    console.log('\n🏪 VENDEDOR DO PEDIDO:')
    console.log('ID:', order.seller.id)
    console.log('Nome:', order.seller.storeName)
    console.log('Saldo Atual:', `R$ ${order.seller.balance.toFixed(2)}`)
    console.log('Total Ganho:', `R$ ${order.seller.totalEarned.toFixed(2)}`)
    console.log('Total Sacado:', `R$ ${order.seller.totalWithdrawn.toFixed(2)}`)
  }

  console.log('\n📋 ITENS DO PEDIDO:')
  console.log('Total de itens:', order.items.length)
  
  let totalSellerRevenue = 0
  let totalCommission = 0
  let totalSupplierCost = 0
  
  order.items.forEach((item, index) => {
    console.log('\n' + '─'.repeat(80))
    console.log(`ITEM ${index + 1}:`)
    console.log('ID:', item.id)
    console.log('Produto:', item.product.name)
    console.log('Tipo:', item.itemType)
    console.log('Quantidade:', item.quantity)
    console.log('Preço Unitário:', `R$ ${item.price.toFixed(2)}`)
    console.log('Preço Total:', `R$ ${(item.price * item.quantity).toFixed(2)}`)
    
    if (item.sellerId) {
      console.log('\n🏪 Vendedor do Item ID:', item.sellerId)
    }
    
    console.log('\n💰 FINANCEIRO DO ITEM:')
    
    if (item.itemType === 'DROPSHIPPING') {
      console.log('Tipo: DROPSHIPPING')
      console.log('Custo Fornecedor (supplierCost):', item.supplierCost ? `R$ ${item.supplierCost.toFixed(2)}` : 'N/A')
      console.log('Taxa Comissão:', item.commissionRate ? `${item.commissionRate}%` : 'N/A')
      console.log('Valor Comissão:', item.commissionAmount ? `R$ ${item.commissionAmount.toFixed(2)}` : 'N/A')
      console.log('Receita Vendedor:', item.sellerRevenue ? `R$ ${item.sellerRevenue.toFixed(2)}` : 'N/A')
      
      console.log('\n📊 CÁLCULO DROP:')
      const costPrice = item.product.costPrice || 0
      const salePrice = item.price
      const commissionRate = item.commissionRate || 0
      
      console.log('Preço Base (costPrice):', `R$ ${costPrice.toFixed(2)}`)
      console.log('Preço Venda (price):', `R$ ${salePrice.toFixed(2)}`)
      console.log('Desconto/Comissão:', `${commissionRate}%`)
      
      const expectedSupplierCost = costPrice * (1 - commissionRate / 100)
      const expectedProfit = salePrice - expectedSupplierCost
      
      console.log('Custo Esperado (base - desconto):', `R$ ${expectedSupplierCost.toFixed(2)}`)
      console.log('Lucro Esperado:', `R$ ${expectedProfit.toFixed(2)}`)
      
      if (item.supplierCost) {
        console.log('\n✅ Custo Real:', `R$ ${item.supplierCost.toFixed(2)}`)
        console.log('Diferença:', `R$ ${(item.supplierCost - expectedSupplierCost).toFixed(2)}`)
      }
      
      if (item.supplierCost) totalSupplierCost += item.supplierCost
    } else {
      console.log('Tipo: STOCK (Estoque Próprio)')
      console.log('Taxa Comissão Plataforma:', item.commissionRate ? `${item.commissionRate}%` : 'N/A')
      console.log('Comissão Plataforma:', item.commissionAmount ? `R$ ${item.commissionAmount.toFixed(2)}` : 'N/A')
      console.log('Receita Líquida Vendedor:', item.sellerRevenue ? `R$ ${item.sellerRevenue.toFixed(2)}` : 'N/A')
    }
    
    if (item.sellerRevenue) totalSellerRevenue += item.sellerRevenue
    if (item.commissionAmount) totalCommission += item.commissionAmount
    
    console.log('\nStatus Fornecedor:', item.supplierStatus || 'N/A')
    console.log('ID Pedido Fornecedor:', item.supplierOrderId || 'N/A')
    console.log('Código Rastreio:', item.trackingCode || 'N/A')
  })

  console.log('\n' + '='.repeat(80))
  console.log('💵 RESUMO FINANCEIRO:')
  console.log('Total Receita Vendedor:', `R$ ${totalSellerRevenue.toFixed(2)}`)
  console.log('Total Comissão:', `R$ ${totalCommission.toFixed(2)}`)
  console.log('Total Custo Fornecedor DROP:', `R$ ${totalSupplierCost.toFixed(2)}`)
  
  console.log('\n🔍 ANÁLISE:')
  
  // Verificar pagamentos DROP pendentes deste vendedor
  if (order.seller) {
    const pendingDropPayments = await prisma.orderItem.findMany({
      where: {
        sellerId: order.seller.id,
        itemType: 'DROPSHIPPING',
        order: {
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] }
        }
      },
      include: {
        order: {
          select: {
            id: true,
            status: true
          }
        },
        product: {
          select: {
            name: true
          }
        }
      }
    })
    
    const totalPending = pendingDropPayments.reduce((sum, item) => sum + (item.supplierCost || 0), 0)
    
    console.log('\n💳 PAGAMENTOS DROP PENDENTES DO VENDEDOR:')
    console.log('Total de itens pendentes:', pendingDropPayments.length)
    console.log('Valor total pendente:', `R$ ${totalPending.toFixed(2)}`)
    
    if (pendingDropPayments.length > 0) {
      console.log('\nDetalhes:')
      pendingDropPayments.forEach(item => {
        console.log(`- ${item.product.name}: R$ ${(item.supplierCost || 0).toFixed(2)} (Pedido: ${item.order.id}, Status: ${item.order.status})`)
      })
    }
    
    const availableBalance = order.seller.balance - totalPending
    console.log('\n💰 SALDO:')
    console.log('Saldo Total:', `R$ ${order.seller.balance.toFixed(2)}`)
    console.log('Pagamentos Pendentes:', `R$ ${totalPending.toFixed(2)}`)
    console.log('Saldo Disponível:', `R$ ${availableBalance.toFixed(2)}`)
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ Investigação concluída!')
}

investigateOrder()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
