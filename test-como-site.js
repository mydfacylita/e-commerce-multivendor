/**
 * 🧪 Testar como o site faz - simulação exata
 */

const fetch = require('node-fetch');

async function testarComoSite() {
  console.log('🧪 Testando EXATAMENTE como o site faz...\n');

  try {
    console.log('📦 Teste SP (deveria usar Correios)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const response = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '01310-100', // São Paulo - FORA do Maranhão
        cartValue: 159.20, // Valor normal
        items: [
          { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 1 } // Produto COM peso/dimensões
        ]
      })
    });

    console.log(`📡 Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta completa:');
      console.log(JSON.stringify(data, null, 2));
      
      const deveriaSer = data.method === 'CORREIOS' ? '✅ CORRETO' : '❌ DEVERIA SER CORREIOS';
      console.log(`\n${deveriaSer} - Método: ${data.method}`);
    } else {
      console.log('❌ Erro:', await response.text());
    }

    // Vamos forçar um cenário onde definitivamente nenhuma regra se aplica
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 Teste RJ com carrinho MUITO ALTO (fora do limite das regras)');
    
    const response2 = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '20040-020', // Rio de Janeiro
        cartValue: 10000.00, // MUITO acima do limite de R$ 5000 da regra
        items: [
          { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 1 }
        ]
      })
    });

    console.log(`📡 Status: ${response2.status}`);
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ Resposta:');
      console.log(JSON.stringify(data2, null, 2));
      
      const deveriaSer2 = data2.method === 'CORREIOS' ? '✅ CORRETO' : '❌ DEVERIA SER CORREIOS';
      console.log(`\n${deveriaSer2} - Método: ${data2.method}`);
    } else {
      console.log('❌ Erro:', await response2.text());
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testarComoSite();