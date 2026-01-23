const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoices() {
  try {
    console.log('🔍 Verificando status de invoices (NF-e)...\n');
    
    // Buscar invoices recentes com status ERROR
    const errorInvoices = await prisma.invoice.findMany({
      where: { status: 'ERROR' },
      include: {
        order: {
          select: {
            id: true,
            buyerName: true,
            total: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    if (errorInvoices.length > 0) {
      console.log('❌ Invoices com status ERROR:');
      console.log('ID | Pedido | Cliente | Status Pedido | Error');
      console.log('-'.repeat(80));
      
      for (const inv of errorInvoices) {
        const orderId = inv.orderId.slice(-8);
        const cliente = inv.order.buyerName || 'N/A';
        const statusPedido = inv.order.status;
        const error = inv.errorMessage || 'N/A';
        
        console.log(`${inv.id.slice(-8)} | ${orderId} | ${cliente.slice(0,15)} | ${statusPedido} | ${error.slice(0,30)}...`);
      }
      console.log('');
    }
    
    // Verificar especificamente o pedido da imagem (S3V6F44X)
    const orderS3V6 = await prisma.order.findFirst({
      where: {
        id: { contains: 's3v6f44x' }
      },
      include: {
        invoices: true
      }
    });
    
    if (orderS3V6) {
      console.log('🎯 Pedido S3V6F44X encontrado:');
      console.log(`ID: ${orderS3V6.id}`);
      console.log(`Status: ${orderS3V6.status}`);
      console.log(`Total: R$ ${orderS3V6.total}`);
      console.log(`Invoices: ${orderS3V6.invoices.length}`);
      
      if (orderS3V6.invoices.length > 0) {
        console.log('\n📄 Status das NF-e:');
        for (const inv of orderS3V6.invoices) {
          console.log(`  - ID: ${inv.id}`);
          console.log(`    Status: ${inv.status}`);
          console.log(`    Número: ${inv.invoiceNumber || 'N/A'}`);
          console.log(`    Erro: ${inv.errorMessage || 'N/A'}`);
        }
      }
    } else {
      console.log('❌ Pedido S3V6F44X não encontrado');
      
      // Tentar buscar por outros critérios
      console.log('\n🔍 Buscando pedidos recentes...');
      const recentOrders = await prisma.order.findMany({
        include: {
          invoices: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      for (const order of recentOrders) {
        console.log(`\nPedido: ${order.id.slice(-8)} | Status: ${order.status} | Cliente: ${order.buyerName || 'N/A'}`);
        if (order.invoices.length > 0) {
          for (const inv of order.invoices) {
            console.log(`  📄 NF-e: ${inv.status} | ${inv.errorMessage || 'OK'}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoices();