/**
 * 🧪 Testar frete com correção de estados
 */

const fetch = require('node-fetch');

async function testarEstados() {
  console.log('🧪 Testando lógica corrigida de estados...\n');

  const testes = [
    { nome: 'São Paulo (SP)', cep: '01310-100', esperado: 'Correios' },
    { nome: 'Rio de Janeiro (RJ)', cep: '20040-020', esperado: 'Correios' },
    { nome: 'Maranhão - São Luís (MA)', cep: '65020-030', esperado: 'Regra MA' },
    { nome: 'Maranhão - Interior (MA)', cep: '65900-000', esperado: 'Regra MA' },
    { nome: 'Ceará (CE)', cep: '60000-000', esperado: 'Correios' }
  ];

  for (const teste of testes) {
    console.log(`📦 TESTE: ${teste.nome} - ${teste.cep}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const response = await fetch('http://localhost:3000/api/shipping/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        },
        body: JSON.stringify({
          cep: teste.cep,
          cartValue: 159.20,
          items: [
            { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 1 }
          ]
        })
      });

      console.log(`📡 Status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        const metodo = data.method || 'UNKNOWN';
        const match = (teste.esperado.includes('Correios') && metodo === 'CORREIOS') || 
                      (teste.esperado.includes('Regra') && metodo === 'REGRA_PERSONALIZADA');
        
        console.log(`${match ? '✅' : '❌'} Esperado: ${teste.esperado} | Recebido: ${metodo}`);
        console.log('📊 Resultado:');
        console.log(`   Valor: R$ ${data.shippingCost}`);
        console.log(`   Prazo: ${data.deliveryDays} dias`);
        console.log(`   Regra: ${data.ruleName || data.message}`);
      } else {
        console.log('❌ Erro:', await response.text());
      }
    } catch (error) {
      console.log('❌ Erro na requisição:', error.message);
    }

    console.log('\n');
  }
}

testarEstados();