// Script para testar importação de produtos
const fetch = require('node-fetch');

async function testImport() {
  console.log('🚀 Iniciando teste de importação...\n');

  // Primeiro, buscar fornecedor AliExpress
  console.log('1️⃣ Buscando fornecedor AliExpress...');
  const suppliersRes = await fetch('http://localhost:3000/api/admin/suppliers');
  const suppliers = await suppliersRes.json();
  
  const aliexpressSupplier = suppliers.find(s => s.name.toLowerCase().includes('aliexpress'));
  
  if (!aliexpressSupplier) {
    console.error('❌ Fornecedor AliExpress não encontrado!');
    return;
  }
  
  console.log(`✅ Fornecedor encontrado: ${aliexpressSupplier.name} (ID: ${aliexpressSupplier.id})\n`);

  // Testar importação com palavra-chave "electronics"
  console.log('2️⃣ Importando produtos (electronics)...\n');
  
  const importRes = await fetch('http://localhost:3000/api/admin/integrations/aliexpress/import-products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supplierId: aliexpressSupplier.id,
      keywords: 'electronics'
    })
  });

  const result = await importRes.json();
  
  console.log('\n📊 Resultado da importação:');
  console.log(JSON.stringify(result, null, 2));
}

testImport().catch(console.error);
