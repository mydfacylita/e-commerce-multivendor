const fetch = require('node-fetch');

async function testarCWS() {
  const usuario = '24223868000119';
  const senha = '@91332785Mi';

  console.log('Testando autenticação API Correios (CWS)...');
  
  // Criar credencial Base64 para Basic Auth
  const credentials = Buffer.from(`${usuario}:${senha}`).toString('base64');
  console.log('Usuario:', usuario);
  console.log('Credentials Base64:', credentials);
  
  // Endpoint simples sem cartão de postagem
  const url = 'https://api.correios.com.br/token/v1/autentica';
  console.log('\n--- Testando:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: ''
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Resposta:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ SUCESSO! Token obtido!');
      console.log('Token (primeiros 100 chars):', data.token?.substring(0, 100) + '...');
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
}

testarCWS();
