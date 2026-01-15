/**
 * 🧪 Testar cálculo de frete
 */

const fetch = require('node-fetch');

async function testarFrete() {
  console.log('🧪 Testando cálculo de frete...\n');

  try {
    const response = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '01310-100', // CEP de São Paulo
        cartValue: 159.20,
        weight: 0.32
      })
    });

    console.log(`📡 Status da resposta: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCESSO! Resultado do frete:\n');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ ERRO na requisição:');
      console.log(errorText);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Testar também para outro CEP
    console.log('\n🧪 Testando para CEP do Rio de Janeiro...\n');
    
    const response2 = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '20040-020', // CEP do Rio de Janeiro
        cartValue: 159.20,
        weight: 0.32
      })
    });

    console.log(`📡 Status da resposta: ${response2.status}`);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ SUCESSO! Resultado do frete para RJ:\n');
      console.log(JSON.stringify(data2, null, 2));
    } else {
      const errorText2 = await response2.text();
      console.log('❌ ERRO na requisição para RJ:');
      console.log(errorText2);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarFrete();