const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOrderData() {
  try {
    console.log('🔍 Testando dados do pedido S3V6F44X para o frontend...\n');
    
    // Buscar o pedido com todas as informações que o frontend precisa
    const order = await prisma.order.findFirst({
      where: {
        id: { contains: 's3v6f44x' }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            pdfUrl: true,
          },
        },
      },
    });
    
    if (order) {
      console.log('📦 Dados do pedido que o frontend receberá:');
      console.log('---------------------------------------------');
      console.log(`ID: ${order.id}`);
      console.log(`Status: ${order.status}`);
      console.log(`Created At: ${order.createdAt}`);
      console.log(`Payment Approved At: ${order.paymentApprovedAt}`);
      console.log(`Separated At: ${order.separatedAt || 'N/A'}`);
      console.log(`Packed At: ${order.packedAt || 'N/A'}`);
      console.log(`Shipped At: ${order.shippedAt || 'N/A'}`);
      console.log(`Tracking Code: ${order.trackingCode || 'N/A'}`);
      
      console.log('\n📄 Invoices:');
      if (order.invoices && order.invoices.length > 0) {
        for (const invoice of order.invoices) {
          console.log(`  - ID: ${invoice.id}`);
          console.log(`    Number: ${invoice.invoiceNumber || 'N/A'}`);
          console.log(`    Status: ${invoice.status}`);
          console.log(`    PDF URL: ${invoice.pdfUrl || 'N/A'}`);
        }
      } else {
        console.log('  Nenhuma NF-e encontrada');
      }
      
      console.log('🎯 Como aparecerá no frontend:');
      console.log('------------------------------');
      
      const separatedStatus = order.separatedAt ? '✅ Separado' : '⏳ Aguardando separação';
      const invoiceStatus = order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR' 
        ? '✅ NF-e emitida' 
        : (order.invoices && order.invoices.length > 0 && order.invoices[0].status === 'ERROR' 
          ? '❌ Erro na NF-e' 
          : '⏳ Aguardando NF-e');
      const packedStatus = order.packedAt ? '✅ Embalado' : '⏳ Aguardando embalagem';
      
      console.log(`1. Pedido realizado: ✅ (${order.createdAt})`);
      console.log(`2. Processando: ${order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED' ? '✅' : '⏳'}`);
      if (order.status === 'PROCESSING') {
        console.log(`   - Separação: ${separatedStatus}`);
        console.log(`   - Nota Fiscal: ${invoiceStatus}`);
        console.log(`   - Embalagem: ${packedStatus}`);
      }
      console.log(`3. Despachado: ${order.status === 'SHIPPED' || order.status === 'DELIVERED' ? '✅' : '⏳'}`);
      console.log(`4. Entregue: ${order.status === 'DELIVERED' ? '✅' : '⏳'}`);
      
      // Seção de NF-e (só aparece quando emitida)
      if (order.invoices && order.invoices.length > 0 && order.invoices[0].status !== 'ERROR') {
        console.log('\n📄 SEÇÃO NOTA FISCAL ELETRÔNICA:');
        console.log('🟢 NF-e disponível para download');
        console.log('📋 [Imprimir DANFE] [Baixar XML]');
      }
    } else {
      console.log('❌ Pedido S3V6F44X não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOrderData();