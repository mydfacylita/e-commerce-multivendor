import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeAffiliateFlow() {
  console.log('🔍 ANALISANDO FLUXO DE COMISSÕES DE AFILIADO\n')
  console.log('═'.repeat(60))
  
  // 1. Buscar venda mais recente
  const sale = await prisma.affiliateSale.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      affiliate: {
        select: { code: true, name: true }
      }
    }
  })
  
  if (!sale) {
    console.log('❌ Nenhuma venda encontrada')
    return
  }
  
  console.log('\n📊 STATUS DA VENDA:')
  console.log(`   Afiliado: ${sale.affiliate.name} (${sale.affiliate.code})`)
  console.log(`   Cliente: ${sale.customerName}`)
  console.log(`   Valor Comissão: R$ ${sale.commissionAmount.toFixed(2)}`)
  console.log(`   Status: ${sale.status}`)
  console.log(`   Data Criação: ${sale.createdAt.toLocaleString('pt-BR')}`)
  console.log(`   Disponível em: ${sale.availableAt ? sale.availableAt.toLocaleString('pt-BR') : 'Não definido'}`)
  console.log()
  
  // 2. Verificar se já passou os 7 dias
  const now = new Date()
  const isAvailable = sale.availableAt && sale.availableAt <= now
  
  console.log('⏰ PERÍODO DE CARÊNCIA (7 DIAS):')
  if (sale.availableAt) {
    const daysLeft = Math.ceil((sale.availableAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (isAvailable) {
      console.log(`   ✅ Comissão JÁ DISPONÍVEL para saque`)
      console.log(`   📅 Disponível desde: ${sale.availableAt.toLocaleDateString('pt-BR')}`)
    } else {
      console.log(`   ⏳ Aguardando período de carência`)
      console.log(`   📅 Disponível em: ${sale.availableAt.toLocaleDateString('pt-BR')}`)
      console.log(`   ⌛ Faltam: ${daysLeft} dia(s)`)
    }
  } else {
    console.log(`   ❌ Data de disponibilidade não definida (status: ${sale.status})`)
  }
  console.log()
  
  // 3. Explicar o fluxo
  console.log('═'.repeat(60))
  console.log('\n📋 FLUXO DE COMISSÕES:\n')
  console.log('1️⃣  PEDIDO CRIADO → Comissão registrada (status: PENDING)')
  console.log('    └─ Comissão não disponível para saque')
  console.log()
  console.log('2️⃣  PEDIDO ENTREGUE → Comissão confirmada (status: CONFIRMED)')
  console.log('    └─ availableAt definido para hoje + 7 dias')
  console.log('    └─ Período de carência para devoluções')
  console.log()
  console.log('3️⃣  APÓS 7 DIAS → Comissão disponível para SAQUE')
  console.log('    └─ ⚠️  NÃO É CREDITADO AUTOMATICAMENTE!')
  console.log('    └─ Afiliado precisa SOLICITAR o saque manualmente')
  console.log('    └─ Valor mínimo: R$ 50,00')
  console.log()
  console.log('4️⃣  AFILIADO SOLICITA SAQUE → Saque pendente aprovação')
  console.log('    └─ Admin recebe a solicitação')
  console.log('    └─ Admin aprova e efetua o pagamento')
  console.log()
  console.log('5️⃣  ADMIN MARCA COMO PAGO → Vendas marcadas como PAID')
  console.log('    └─ Comissão efetivamente paga')
  console.log()
  console.log('═'.repeat(60))
  
  // 4. Verificar comissões disponíveis
  console.log('\n💰 COMISSÕES DISPONÍVEIS PARA SAQUE AGORA:\n')
  
  const available = await prisma.affiliateSale.aggregate({
    where: {
      affiliateId: sale.affiliateId,
      status: 'CONFIRMED',
      availableAt: {
        lte: new Date()
      }
    },
    _sum: { commissionAmount: true },
    _count: true
  })
  
  const blocked = await prisma.affiliateSale.aggregate({
    where: {
      affiliateId: sale.affiliateId,
      status: 'CONFIRMED',
      availableAt: {
        gt: new Date()
      }
    },
    _sum: { commissionAmount: true },
    _count: true
  })
  
  console.log(`   ✅ Disponível: R$ ${(available._sum.commissionAmount || 0).toFixed(2)} (${available._count} venda(s))`)
  console.log(`   ⏳ Bloqueado (carência): R$ ${(blocked._sum.commissionAmount || 0).toFixed(2)} (${blocked._count} venda(s))`)
  console.log()
  
  if ((available._sum.commissionAmount || 0) >= 50) {
    console.log('✅ Valor disponível atingiu o mínimo de R$ 50,00')
    console.log('👉 Afiliado JÁ PODE solicitar saque!')
  } else if ((available._sum.commissionAmount || 0) > 0) {
    console.log('⚠️  Valor disponível ainda não atingiu o mínimo de R$ 50,00')
    console.log('👉 Afiliado precisa aguardar mais vendas')
  } else {
    console.log('ℹ️  Nenhuma comissão disponível para saque no momento')
  }
  
  console.log('\n═'.repeat(60))
}

analyzeAffiliateFlow()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
