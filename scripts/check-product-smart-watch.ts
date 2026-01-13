import { prisma } from '../lib/prisma'

async function checkProduct() {
  console.log('🔍 INVESTIGANDO PRODUTO: Smart Watch Series 7')
  console.log('='.repeat(80))
  
  // Buscar o produto
  const product = await prisma.product.findFirst({
    where: {
      name: {
        contains: 'Smart Watch'
      }
    },
    include: {
      category: true,
      seller: {
        select: {
          id: true,
          storeName: true
        }
      }
    }
  })

  if (!product) {
    console.log('❌ Produto não encontrado!')
    return
  }

  console.log('\n📦 DADOS DO PRODUTO:')
  console.log('ID:', product.id)
  console.log('Nome:', product.name)
  console.log('Slug:', product.slug)
  console.log('Preço:', `R$ ${product.price.toFixed(2)}`)
  console.log('Preço Custo:', `R$ ${(product.costPrice || 0).toFixed(2)}`)
  console.log('Preço Comparação:', product.comparePrice ? `R$ ${product.comparePrice.toFixed(2)}` : 'N/A')
  console.log('Estoque:', product.stock)
  console.log('Ativo:', product.active ? 'Sim' : 'Não')
  console.log('Destaque:', product.featured ? 'Sim' : 'Não')
  
  console.log('\n🏷️ TIPO DE PRODUTO:')
  console.log('isDropshipping:', product.isDropshipping ? 'SIM - É DROPSHIPPING' : 'NÃO - É ESTOQUE')
  
  if (product.seller) {
    console.log('\n🏪 VENDEDOR:')
    console.log('ID:', product.seller.id)
    console.log('Nome:', product.seller.storeName)
  } else {
    console.log('\n🏪 VENDEDOR: ADM (Sem vendedor específico)')
  }
  
  if (product.category) {
    console.log('\n📁 CATEGORIA:')
    console.log('Nome:', product.category.name)
    console.log('Slug:', product.category.slug)
  }
  
  // Buscar todos os OrderItems desse produto
  console.log('\n📋 HISTÓRICO DE VENDAS:')
  const orderItems = await prisma.orderItem.findMany({
    where: {
      productId: product.id
    },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  })
  
  console.log(`Total de vendas: ${orderItems.length}`)
  
  orderItems.forEach((item, index) => {
    console.log(`\n${index + 1}. Order: ${item.order.id}`)
    console.log(`   Status: ${item.order.status}`)
    console.log(`   Data: ${item.order.createdAt.toLocaleString('pt-BR')}`)
    console.log(`   Tipo no OrderItem: ${item.itemType}`)
    console.log(`   Seller ID: ${item.sellerId || 'N/A'}`)
    console.log(`   Quantidade: ${item.quantity}`)
    console.log(`   Preço: R$ ${item.price.toFixed(2)}`)
    console.log(`   Receita Vendedor: R$ ${(item.sellerRevenue || 0).toFixed(2)}`)
    console.log(`   Custo Fornecedor: R$ ${(item.supplierCost || 0).toFixed(2)}`)
    console.log(`   Taxa Comissão: ${item.commissionRate || 0}%`)
  })
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ Investigação concluída!')
}

checkProduct()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
