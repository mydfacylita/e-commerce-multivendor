const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Buscando pedido DELIVERED com afiliado MSIAEL...\n');
  
  const order = await prisma.order.findFirst({
    where: {
      affiliateCode: 'MSIAEL',
      status: 'DELIVERED'
    },
    include: {
      affiliateSale: true
    }
  });
  
  if (!order) {
    console.log('❌ Nenhum pedido DELIVERED encontrado com afiliado MSIAEL');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ Pedido encontrado!');
  console.log(`   ID: ${order.id}`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Total: R$ ${order.total.toFixed(2)}`);
  console.log(`   Afiliado: ${order.affiliateCode} (ID: ${order.affiliateId})`);
  console.log(`   AffiliateSale: ${order.affiliateSale ? 'SIM' : 'NÃO'}\n`);
  
  if (order.affiliateSale) {
    console.log('💰 Dados da Comissão:');
    console.log(`   Status: ${order.affiliateSale.status}`);
    console.log(`   Valor: R$ ${order.affiliateSale.commissionAmount.toFixed(2)}`);
    console.log(`   Disponível em: ${order.affiliateSale.availableAt ? order.affiliateSale.availableAt.toLocaleString('pt-BR') : 'Não definido'}\n`);
    
    if (order.affiliateSale.availableAt) {
      const now = new Date();
      const diasRestantes = Math.ceil((order.affiliateSale.availableAt - now) / (1000 * 60 * 60 * 24));
      
      console.log('⏰ Período de Carência:');
      if (diasRestantes > 0) {
        console.log(`   ⏳ Faltam ${diasRestantes} dias para liberar`);
        console.log('   💰 Comissão BLOQUEADA\n');
      } else {
        console.log('   ✅ Período completado!');
        console.log('   💰 Comissão DISPONÍVEL para saque\n');
      }
    }
  } else {
    console.log('⚠️  Venda de afiliado NÃO existe!');
    console.log('   Isso é um erro - deveria ter sido criada automaticamente.\n');
  }
  
  console.log('📝 Para acessar o dashboard: http://localhost:3000/afiliado/dashboard\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
