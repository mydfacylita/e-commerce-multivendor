/**
 * 🎯 TESTE FINAL - FORÇAR CORREIOS
 */

const fetch = require('node-fetch');

async function testeFinalCorreios() {
  console.log('🎯 TESTE FINAL - Deve usar CORREIOS obrigatoriamente!\n');

  try {
    const response = await fetch('http://localhost:3000/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
      },
      body: JSON.stringify({
        cep: '01310-100', // SÃO PAULO - fora MA ✅
        cartValue: 159.20, // Dentro do limite ✅
        items: [
          { id: 'cmk4d6tko000g9o4rs0x2t1qz', quantity: 1 } // Produto com peso/dim ✅
        ]
      })
    });

    console.log(`📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 RESULTADO FINAL:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.method === 'CORREIOS') {
        console.log('\n🎉 SUCESSO! Os Correios foram usados! ✅');
        console.log(`💰 Valor: R$ ${data.shippingCost}`);
        console.log(`📅 Prazo: ${data.deliveryDays} dias`);
      } else {
        console.log('\n❌ FALHOU! Não usou os Correios');
        console.log(`📋 Método usado: ${data.method}`);
        console.log(`💰 Valor: R$ ${data.shippingCost}`);
        
        console.log('\n🔍 POSSÍVEIS CAUSAS:');
        console.log('1. CEP identificado como MA (erro na função getCepState)');
        console.log('2. Produto sem peso/dimensões (hasAllWeightsDimensions = false)');
        console.log('3. Erro na requisição interna aos Correios');
        console.log('4. Lógica de priorização incorreta');
      }
    } else {
      console.log('❌ Erro na requisição:', await response.text());
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testeFinalCorreios();