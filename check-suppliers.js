const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCreateSupplier() {
  try {
    // Verificar fornecedores existentes
    const suppliers = await prisma.supplier.findMany();
    
    console.log('📋 Fornecedores encontrados:', suppliers.length);
    
    if (suppliers.length > 0) {
      console.log('\n✅ Fornecedores existentes:');
      suppliers.forEach((supplier, i) => {
        console.log(`${i+1}. ${supplier.name} (${supplier.type}) - ${supplier.isActive ? 'Ativo' : 'Inativo'}`);
      });
    } else {
      console.log('\n❌ Nenhum fornecedor encontrado!');
      console.log('🔧 Criando fornecedor padrão AliExpress...');
      
      const aliexpressSupplier = await prisma.supplier.create({
        data: {
          name: 'AliExpress Dropshipping',
          email: 'aliexpress@dropshipping.local',
          phone: '+86 571 8502 2088',
          website: 'https://www.aliexpress.com',
          apiUrl: 'https://api-sg.aliexpress.com/sync',
          apiKey: 'aliexpress_api_key',
          type: 'aliexpress',
          isActive: true,
          commission: 0,
        }
      });
      
      console.log('✅ Fornecedor AliExpress criado:', aliexpressSupplier.name);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateSupplier();