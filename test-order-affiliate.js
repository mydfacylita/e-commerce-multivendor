const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('\n🔍 VERIFICANDO DADOS DO PEDIDO\n');
    console.log('='.repeat(60));
    
    const orderId = 'cmliyw94i00062nmnvatoy8h8';
    
    // 1. Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        total: true,
        affiliateId: true,
        affiliateCode: true,
        createdAt: true
      }
    });
    
    if (!order) {
      console.log('❌ Pedido não encontrado!');
      process.exit(1);
    }
    
    console.log('\n📦 PEDIDO:');
    console.log(`   ID: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Total: R$ ${order.total.toFixed(2)}`);
    console.log(`   Afiliado ID: ${order.affiliateId || 'NENHUM'}`);
    console.log(`   Código Afiliado: ${order.affiliateCode || 'NENHUM'}`);
    console.log(`   Criado em: ${order.createdAt.toLocaleString('pt-BR')}`);
    
    if (!order.affiliateId) {
      console.log('\n⚠️  PEDIDO NÃO TEM AFILIADO ASSOCIADO!');
      console.log('   Este pedido foi criado sem link de afiliado.');
      console.log('   Não há comissão para processar.');
      await prisma.$disconnect();
      return;
    }
    
    // 2. Buscar venda do afiliado
    const sale = await prisma.affiliateSale.findUnique({
      where: { orderId },
      include: {
        affiliate: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
    
    console.log('\\n💰 VENDA DO AFILIADO:');
    if (!sale) {
      console.log('   ❌ REGISTRO NÃO ENCONTRADO!');
      console.log('   Venda deveria ter sido criada automaticamente.');
      console.log('   Isso é um erro do sistema.');
    } else {
      console.log(`   ID: ${sale.id}`);
      console.log(`   Afiliado: ${sale.affiliate.name} (${sale.affiliate.code})`);
      console.log(`   Comissão: R$ ${sale.commissionAmount.toFixed(2)} (${sale.commissionRate}%)`);
      console.log(`   Status: ${sale.status}`);
      console.log(`   Disponível em: ${sale.availableAt ? sale.availableAt.toLocaleString('pt-BR') : 'Não definido'}`);
      console.log(`   Criado em: ${sale.createdAt.toLocaleString('pt-BR')}`);
      
      // 3. Verificar se já passou o período de carência
      if (sale.availableAt) {
        const now = new Date();
        const diasRestantes = Math.ceil((sale.availableAt - now) / (1000 * 60 * 60 * 24));
        
        console.log('\\n⏰ PERÍODO DE CARÊNCIA:');
        if (diasRestantes > 0) {
          console.log(`   ⏳ Ainda faltam ${diasRestantes} dias`);
          console.log(`   💰 Comissão bloqueada até ${sale.availableAt.toLocaleDateString('pt-BR')}`);
        } else {
          console.log(`   ✅ Período completado!`);
          console.log(`   💰 Comissão DISPONÍVEL para saque`);
        }
      }
    }
    
    await prisma.$disconnect();
    console.log('\\n' + '='.repeat(60) + '\\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

test();
