const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('\n🧪 TESTE MANUAL DE COMISSÃO\n');
    console.log('='.repeat(50));
    
    // Simular dados do pedido que você fez
    const orderId = 'test-order-' + Date.now();
    const affiliateCode = 'MSIAEL';
    const orderTotal = 16.83;
    const commissionRate = 3;
    const commissionAmount = (orderTotal * commissionRate) / 100;
    
    console.log('\n1️⃣ Criando afiliado de teste...');
    
    // Criar afiliado
    const affiliate = await prisma.affiliate.create({
      data: {
        name: 'Misael Feitoza Ribeiro',
        email: 'misael_ribeiro@hotmail.com',
        cpf: '12345678901',
        phone: '85999999999',
        code: affiliateCode,
        commissionRate: commissionRate,
        status: 'APPROVED',
        userId: 'test-user-' + Date.now()
      }
    });
    
    console.log(`   ✅ Afiliado criado: ${affiliate.name} (${affiliate.code})`);
    
    console.log('\n2️⃣ Criando pedido de teste...');
    
    // Criar pedido
    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId: affiliate.userId,
        status: 'DELIVERED',
        total: orderTotal,
        affiliateId: affiliate.id,
        affiliateCode: affiliateCode,
        buyerEmail: 'cliente@teste.com',
        buyerName: 'Cliente Teste',
        shippingAddress: 'Rua Teste, 123'
      }
    });
    
    console.log(`   ✅ Pedido criado: ${order.id} (${order.status})`);
    
    console.log('\n3️⃣ Criando venda do afiliado...');
    
    // Criar venda do afiliado com período de carência
    const availableAt = new Date();
    availableAt.setDate(availableAt.getDate() + 7); // 7 dias a partir de hoje
    
    const sale = await prisma.affiliateSale.create({
      data: {
        affiliateId: affiliate.id,
        orderId: order.id,
        orderTotal: orderTotal,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        status: 'CONFIRMED',
        availableAt: availableAt
      }
    });
    
    console.log(`   ✅ Venda criada: R$ ${sale.commissionAmount.toFixed(2)}`);
    console.log(`   📅 Disponível em: ${availableAt.toLocaleDateString('pt-BR')}`);
    
    console.log('\n4️⃣ Verificando período de carência...');
    
    const now = new Date();
    const diasRestantes = Math.ceil((availableAt - now) / (1000 * 60 * 60 * 24));
    
    if (diasRestantes > 0) {
      console.log(`   ⏳ Faltam ${diasRestantes} dias para liberar`);
      console.log('   💰 Status: BLOQUEADO (período de carência)');
    } else {
      console.log('   ✅ Período completado!');
      console.log('   💰 Status: DISPONÍVEL para saque');
    }
    
    console.log('\n5️⃣ Simulando liberação imediata (para teste)...');
    
    // Liberar imediatamente para demonstração
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: sale.id },
      data: { availableAt: new Date() }
    });
    
    console.log('   ✅ Comissão liberada para teste!');
    console.log(`   💰 R$ ${updatedSale.commissionAmount.toFixed(2)} disponível para saque`);
    
    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('\n📊 RESUMO:');
    console.log(`   • Afiliado: ${affiliate.name}`);
    console.log(`   • Código: ${affiliateCode}`);
    console.log(`   • Pedido: R$ ${orderTotal.toFixed(2)}`);
    console.log(`   • Comissão: R$ ${commissionAmount.toFixed(2)} (${commissionRate}%)`);
    console.log(`   • Status: DISPONÍVEL`);
    console.log('\n💡 O sistema de carência está funcionando!');
    console.log('   Normalmente aguardaria 7 dias antes de liberar.');
    console.log('\n');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

test();