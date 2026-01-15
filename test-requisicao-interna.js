/**
 * 🧪 Testar requisição interna para Correios
 */

const fetch = require('node-fetch');

async function testarRequisicaoInterna() {
  console.log('🧪 Testando requisição INTERNA dos Correios...\n');

  try {
    // Simular EXATAMENTE o que a API /shipping/quote faz
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    console.log(`📡 URL base: ${baseUrl}`);
    
    const correiosResponse = await fetch(`${baseUrl}/api/shipping/correios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cepOrigem: '65067380',
        cepDestino: '01310100',
        peso: Math.max(0.32, 0.1), // peso mínimo 100g
        comprimento: Math.max(25, 20),
        altura: Math.max(3, 5), 
        largura: Math.max(20, 15),
        valor: 159.20
      })
    });

    console.log(`📡 Status da resposta: ${correiosResponse.status}`);
    console.log(`📡 Headers: ${JSON.stringify(Object.fromEntries(correiosResponse.headers.entries()), null, 2)}`);

    if (correiosResponse.ok) {
      const correiosData = await correiosResponse.json();
      console.log('✅ Dados dos Correios:');
      console.log(JSON.stringify(correiosData, null, 2));
      
      // Simular filtragem dos resultados
      const resultadosValidos = correiosData.resultados?.filter((r) => !r.erro && r.valor > 0);
      console.log(`\n📊 Resultados válidos: ${resultadosValidos?.length || 0}`);
      
      if (resultadosValidos && resultadosValidos.length > 0) {
        resultadosValidos.sort((a, b) => a.valor - b.valor);
        const maisBarato = resultadosValidos[0];
        console.log(`💰 Mais barato: ${maisBarato.servico} - R$ ${maisBarato.valor} (${maisBarato.prazo} dias)`);
      } else {
        console.log('❌ Nenhum resultado válido encontrado');
      }
    } else {
      const errorText = await correiosResponse.text();
      console.log('❌ Erro na resposta:');
      console.log(errorText);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Este é o MESMO teste que a API /shipping/quote deveria fazer');
    console.log('💡 Se funciona aqui, o problema está na lógica da API quote');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }
}

testarRequisicaoInterna();