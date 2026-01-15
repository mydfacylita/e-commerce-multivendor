/**
 * 🧪 Teste simples para SP (fora do MA)
 */

const fetch = require('node-fetch');

async function testeSimples() {
  console.log('🧪 Teste simples - SP (deve usar Correios)...\n');

  try {
    const response = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '01310-100', // São Paulo - FORA do Maranhão
        cartValue: 159.20,
        items: [
          { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 1 } // Camiseta com dimensões corrigidas
        ]
      })
    });

    console.log(`📡 Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resultado:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Erro:', await response.text());
    }

    console.log('\n💡 Verifique os logs do servidor para ver as mensões de debug...');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testeSimples();