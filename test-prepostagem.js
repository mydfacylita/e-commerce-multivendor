const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrePostagem() {
  console.log('=== Teste Pré-Postagem Correios CWS ===\n');

  // 1. Buscar credenciais
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: [
          'correios.usuario',
          'correios.codigoAcesso',
          'correios.cartaoPostagem',
          'correios.cepOrigem'
        ]
      }
    }
  });

  const configMap = {};
  configs.forEach(c => {
    const key = c.key.replace('correios.', '');
    configMap[key] = c.value;
  });

  // 2. Obter token
  console.log('1. Obtendo token...');
  const basicAuth = Buffer.from(`${configMap.usuario}:${configMap.codigoAcesso}`).toString('base64');
  
  const tokenResponse = await fetch('https://api.correios.com.br/token/v1/autentica/cartaopostagem', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`
    },
    body: JSON.stringify({ numero: configMap.cartaoPostagem })
  });

  if (!tokenResponse.ok) {
    console.log('❌ Erro ao obter token');
    await prisma.$disconnect();
    return;
  }

  const tokenData = await tokenResponse.json();
  console.log('   ✅ Token obtido!');

  // 3. Testar criar pré-postagem
  console.log('\n2. Criando pré-postagem de teste...');
  
  const payload = {
    idCorreios: configMap.usuario,
    cartaoPostagem: configMap.cartaoPostagem,
    remetente: {
      nome: "MYDSHOP COMERCIO",
      documento: "24223868000119",
      endereco: {
        cep: "65067380",
        logradouro: "Rua Teste",
        numero: "123",
        bairro: "Centro",
        cidade: "Sao Luis",
        uf: "MA"
      }
    },
    destinatario: {
      nome: "Cliente Teste", 
      documento: "12345678909",
      endereco: {
        cep: "01310100",
        logradouro: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "Sao Paulo",
        uf: "SP"
      }
    },
    codigoServico: "03298",
    peso: 500,
    formato: 1,
    altura: 10,
    largura: 15,
    comprimento: 20,
    objetosProibidos: false,
    declaracaoConteudo: [{
      descricao: "Mercadoria Teste",
      quantidade: 1,
      valor: 50.00
    }]
  };

  // Testar vários endpoints
  const endpoints = [
    'https://api.correios.com.br/prepostagem/v1/prepostagens',
    'https://api.correios.com.br/prepostagem/v2/prepostagem',
    'https://api.correios.com.br/prepostagem/v1/prepostagem'
  ];

  for (const endpoint of endpoints) {
    console.log('\n   Testando:', endpoint);
    
    const prePostagemResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.token}`
      },
      body: JSON.stringify(payload)
    });

    console.log('   Status:', prePostagemResponse.status);
    const responseText = await prePostagemResponse.text();
    console.log('   Resposta:', responseText.substring(0, 500));

    if (prePostagemResponse.ok) {
      const result = JSON.parse(responseText);
      console.log('\n✅ SUCESSO! Código de rastreio:', result.codigoObjeto || result.objeto?.codigoObjeto);
      break;
    }
  }

  await prisma.$disconnect();
}

testPrePostagem().catch(console.error);
