// Teste da API de fornecedores

async function testSuppliersAPI() {
  try {
    console.log('🧪 Testando API de fornecedores...');
    
    const response = await fetch('http://localhost:3000/api/admin/suppliers');
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    if (!response.ok) {
      console.log('❌ Erro HTTP:', response.status);
      const errorText = await response.text();
      console.log('❌ Erro detalhado:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Resposta recebida:');
    console.log('📋 Estrutura:', Object.keys(data));
    
    if (data.suppliers) {
      console.log('✅ Fornecedores encontrados:', data.suppliers.length);
      data.suppliers.forEach((supplier, i) => {
        console.log(`${i+1}. ${supplier.name} (ID: ${supplier.id})`);
      });
    } else if (Array.isArray(data)) {
      console.log('⚠️ Resposta é array direto (precisa de { suppliers: [...] })');
      console.log('📋 Fornecedores:', data.length);
    } else {
      console.log('❌ Formato inesperado:', data);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testSuppliersAPI();