import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAndFixAffiliateStatus() {
  console.log('🔍 Verificando venda do afiliado...\n')
  
  // Buscar a venda mais recente
  const sale = await prisma.affiliateSale.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          total: true
        }
      },
      affiliate: {
        select: {
          code: true,
          name: true
        }
      }
    }
  })
  
  if (!sale) {
    console.log('❌ Nenhuma venda encontrada')
    return
  }
  
  console.log('📋 Venda do Afiliado:')
  console.log(`   ID: ${sale.id}`)
  console.log(`   Pedido: ${sale.orderId}`)
  console.log(`   Cliente: ${sale.customerName}`)
  console.log(`   Valor Pedido: R$ ${sale.orderTotal.toFixed(2)}`)
  console.log(`   Comissão: R$ ${sale.commissionAmount.toFixed(2)}`)
  console.log(`   Status Venda: ${sale.status}`)
  console.log(`   Status Pedido: ${sale.order.status}`)
  console.log(`   Afiliado: ${sale.affiliate.name} (${sale.affiliate.code})`)
  console.log()
  
  // Se o pedido está DELIVERED mas a venda ainda está PENDING, corrigir
  if (sale.order.status === 'DELIVERED' && sale.status === 'PENDING') {
    console.log('⚠️  PROBLEMA ENCONTRADO!')
    console.log('   Pedido está DELIVERED mas venda ainda está PENDING')
    console.log()
    console.log('🔧 Corrigindo status...')
    
    const availableAt = new Date()
    availableAt.setDate(availableAt.getDate() + 7)
    
    await prisma.affiliateSale.update({
      where: { id: sale.id },
      data: {
        status: 'CONFIRMED',
        availableAt
      }
    })
    
    console.log('✅ Status atualizado para CONFIRMED')
    console.log(`📅 Disponível para saque em: ${availableAt.toLocaleDateString('pt-BR')}`)
  } else if (sale.status === 'CONFIRMED') {
    console.log('✅ Status já está correto: CONFIRMED')
  } else if (sale.status === 'PENDING') {
    console.log(`ℹ️  Status PENDING é correto (pedido ainda em ${sale.order.status})`)
  }
}

checkAndFixAffiliateStatus()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
