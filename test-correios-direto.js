/**
 * 🧪 Testar DIRETAMENTE a API dos Correios
 */

const fetch = require('node-fetch');

async function testarCorreiosDireto() {
  console.log('🧪 Testando DIRETAMENTE a API dos Correios...\n');

  try {
    // Teste direto na API dos Correios
    console.log('📦 TESTE DIRETO: API dos Correios (bypass regras)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const responseCorreios = await fetch('http://localhost:3000/api/shipping/correios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cepOrigem: '65067380',
        cepDestino: '01310100',
        peso: 0.5,
        comprimento: 20,
        altura: 10,
        largura: 15,
        valor: 159.20
      })
    });

    console.log(`📡 Status Correios: ${responseCorreios.status}`);
    if (responseCorreios.ok) {
      const dataCorreios = await responseCorreios.json();
      console.log('✅ Resultado CORREIOS:');
      console.log(JSON.stringify(dataCorreios, null, 2));
    } else {
      console.log('❌ Erro Correios:', await responseCorreios.text());
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Agora vou desabilitar temporariamente as regras para forçar o quote usar Correios
    console.log('📦 TESTE: Desabilitando regras para forçar Correios');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarCorreiosDireto();