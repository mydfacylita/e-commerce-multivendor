const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCWSAuth() {
  console.log('=== Teste Integração Correios CWS ===\n');

  // 1. Buscar credenciais
  console.log('1. Buscando credenciais do banco...');
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: [
          'correios.usuario',
          'correios.codigoAcesso',
          'correios.cartaoPostagem',
          'correios.cnpj',
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

  console.log('   Usuario:', configMap.usuario);
  console.log('   Cartão Postagem:', configMap.cartaoPostagem);
  console.log('   Código de Acesso:', configMap.codigoAcesso ? '***OK***' : 'NÃO ENCONTRADO');

  if (!configMap.codigoAcesso) {
    console.log('\n❌ Código de acesso não encontrado no banco!');
    await prisma.$disconnect();
    return;
  }

  // 2. Obter token
  console.log('\n2. Obtendo token de autenticação...');
  
  const basicAuth = Buffer.from(`${configMap.usuario}:${configMap.codigoAcesso}`).toString('base64');
  
  const tokenResponse = await fetch('https://api.correios.com.br/token/v1/autentica/cartaopostagem', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`
    },
    body: JSON.stringify({
      numero: configMap.cartaoPostagem
    })
  });

  if (!tokenResponse.ok) {
    console.log('   ❌ Erro ao obter token:', tokenResponse.status);
    const errorText = await tokenResponse.text();
    console.log('   Resposta:', errorText);
    await prisma.$disconnect();
    return;
  }

  const tokenData = await tokenResponse.json();
  console.log('   ✅ Token obtido!');
  console.log('   Ambiente:', tokenData.ambiente);
  console.log('   Expira em:', tokenData.expiraEm);
  console.log('   Token:', tokenData.token?.substring(0, 50) + '...');

  // 3. Verificar APIs disponíveis
  console.log('\n3. APIs disponíveis no contrato:');
  if (tokenData.cartaoPostagem?.apis) {
    tokenData.cartaoPostagem.apis.forEach(api => {
      console.log(`   - API ${api.api}: ${api.op === 'T' ? 'Acesso Total' : 'Leitura'}`);
    });
  } else {
    console.log('   (sem APIs listadas)');
  }

  console.log('\n=== SUCESSO! Integração pronta para uso ===');
  console.log('\nAgora você pode gerar etiquetas pelo painel admin.');

  await prisma.$disconnect();
}

testCWSAuth().catch(console.error);
