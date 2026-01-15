/**
 * 🧪 Testar nova lógica de frete com produtos
 */

const fetch = require('node-fetch');

async function testarFreteComProdutos() {
  console.log('🧪 Testando nova lógica de frete...\n');

  try {
    // Teste 1: Com produto que tem peso/dimensões
    console.log('📦 TESTE 1: Produto com peso e dimensões completas');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const response1 = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '01310-100', // São Paulo
        cartValue: 159.20,
        items: [
          { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 1 } // Camiseta com peso/dimensões
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

    // Teste 2: Sem produtos (peso direto)
    console.log('📦 TESTE 2: Peso direto (sem produtos)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const response2 = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '01310-100',
        cartValue: 159.20,
        weight: 0.5 // peso direto
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

    // Teste 3: Para outro CEP
    console.log('📦 TESTE 3: CEP do Rio de Janeiro');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const response3 = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '20040-020', // Rio de Janeiro
        cartValue: 159.20,
        items: [
          { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 2 } // 2 camisetas
        ]
      })
    });

    console.log(`📡 Status: ${response3.status}`);
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('✅ Resultado:');
      console.log(JSON.stringify(data3, null, 2));
    } else {
      console.log('❌ Erro:', await response3.text());
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarFreteComProdutos();