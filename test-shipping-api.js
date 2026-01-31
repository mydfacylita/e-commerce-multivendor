// Teste da API de frete para produto importado
const API_KEY = 'mk_adm_e62fe4e2-5dba-42e8-a548-68f8abf24d17';

async function testShipping() {
  const productId = 'cmk4d6tko0008137b9lhawz3h'; // ID do produto importado
  
  const response = await fetch('http://localhost:3000/api/shipping/quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      cep: '65067380',
      products: [
        { id: productId, quantity: 1 }
      ]
    })
  });
  
  const data = await response.json();
  console.log('=== RESPOSTA DA API DE FRETE ===');
  console.log(JSON.stringify(data, null, 2));
  console.log('');
  console.log('É INTERNACIONAL?', data.isInternational);
  console.log('Método:', data.shippingMethod);
  console.log('Custo:', data.shippingCost);
}

testShipping().catch(console.error);
