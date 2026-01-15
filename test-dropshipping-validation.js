// Teste da validação de dropshipping

console.log('🧪 TESTE: Sistema de Validação Dropshipping\n');

const testProducts = [
  '1005010001264169', // Produto da screenshot (provavelmente incompatível)
  '1005003622297837', // Outro produto para teste
  '1005002631926261', // Mais um produto
];

async function testDropshippingValidation() {
  console.log('📋 Produtos para teste:');
  testProducts.forEach((id, i) => {
    console.log(`${i+1}. ${id}`);
  });

  console.log('\n🔍 Iniciando validação...');
  console.log('⏳ (Isso pode levar alguns segundos)\n');

  try {
    const response = await fetch('http://localhost:3000/api/admin/integrations/aliexpress/import-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: 'wireless bluetooth headphones', // Categoria com produtos diversos
        categoryId: '', 
        supplierId: 'teste'
      })
    });

    const data = await response.json();

    console.log('📊 RESULTADOS:');
    console.log('Status:', response.ok ? '✅ Sucesso' : '❌ Erro');
    
    if (data.success) {
      console.log(`✅ Produtos importados: ${data.imported || 0}`);
      console.log(`🔄 Produtos atualizados: ${data.updated || 0}`);
      console.log(`⏭️  Produtos ignorados: ${data.skipped || 0}`);
      console.log(`📈 Taxa de sucesso: ${((data.imported || 0) / (data.total || 1) * 100).toFixed(1)}%`);
    } else {
      console.log('❌ Erro:', data.error);
    }

    if (data.debugInfo) {
      console.log('\n🔍 Debug Info:');
      console.log(JSON.stringify(data.debugInfo, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testDropshippingValidation();