/**
 * 🧪 Forçar teste dos Correios
 */

const fetch = require('node-fetch');

async function forcarTesteCorreios() {
  console.log('🧪 Forçando teste da API dos Correios...\n');

  try {
    // ESTRATÉGIA 1: Testar com peso MUITO alto (acima de 3kg)
    console.log('📦 TESTE 1: Peso alto (acima do limite das regras)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const response1 = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '01310-100', // São Paulo
        cartValue: 200.00,
        weight: 5.5, // ACIMA de 5kg e 3kg (limites das regras)
        items: [
          { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 1 }
        ]
      })
    });

    console.log(`📡 Status: ${response1.status}`);
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Resultado:');
      console.log(JSON.stringify(data1, null, 2));
    } else {
      console.log('❌ Erro:', await response1.text());
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ESTRATÉGIA 2: Valor do carrinho baixo (abaixo do mínimo)
    console.log('📦 TESTE 2: Carrinho baixo (abaixo de R$ 99)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const response2 = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '01310-100', // São Paulo
        cartValue: 50.00, // ABAIXO de R$ 99 (mínimo das regras)
        weight: 1.0,
        items: [
          { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 1 }
        ]
      })
    });

    console.log(`📡 Status: ${response2.status}`);
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ Resultado:');
      console.log(JSON.stringify(data2, null, 2));
    } else {
      console.log('❌ Erro:', await response2.text());
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ESTRATÉGIA 3: Desabilitar temporariamente as regras
    console.log('📦 TESTE 3: Desabilitando regras temporariamente...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

forcarTesteCorreios();