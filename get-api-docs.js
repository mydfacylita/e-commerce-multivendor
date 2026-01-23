const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getApiDocs() {
  // Buscar credenciais
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: ['correios.usuario', 'correios.codigoAcesso', 'correios.cartaoPostagem']
      }
    }
  });

  const configMap = {};
  configs.forEach(c => {
    const key = c.key.replace('correios.', '');
    configMap[key] = c.value;
  });

  // Obter token
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

  const tokenData = await tokenResponse.json();
  
  // Buscar documentação
  const docsResponse = await fetch('https://api.correios.com.br/prepostagem/v3/api-docs', {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${tokenData.token}`
    }
  });

  const docs = await docsResponse.json();
  
  // Mostrar o schema RequestPrePostagemExternaDTO
  const schema = docs.components?.schemas?.RequestPrePostagemExternaDTO;
  console.log('=== RequestPrePostagemExternaDTO ===');
  console.log(JSON.stringify(schema, null, 2));

  // Mostrar RemetenteDTO
  const remetenteSchema = docs.components?.schemas?.RemetenteDTO;
  console.log('\n=== RemetenteDTO ===');
  console.log(JSON.stringify(remetenteSchema, null, 2));

  // Mostrar DestinatarioDTO
  const destinatarioSchema = docs.components?.schemas?.DestinatarioDTO;
  console.log('\n=== DestinatarioDTO ===');
  console.log(JSON.stringify(destinatarioSchema, null, 2));

  // Mostrar EnderecoRemetenteDTO
  const endRemetenteSchema = docs.components?.schemas?.EnderecoRemetenteDTO;
  console.log('\n=== EnderecoRemetenteDTO ===');
  console.log(JSON.stringify(endRemetenteSchema, null, 2));

  // Mostrar EnderecoDestinatarioDTO
  const endDestinatarioSchema = docs.components?.schemas?.EnderecoDestinatarioDTO;
  console.log('\n=== EnderecoDestinatarioDTO ===');
  console.log(JSON.stringify(endDestinatarioSchema, null, 2));

  // Mostrar endpoints de prepostagem
  console.log('\n=== Endpoints de Prepostagem ===');
  const paths = docs.paths;
  for (const path in paths) {
    if (path.includes('prepostag') || path.includes('rotulo')) {
      console.log(`\n${path}:`);
      for (const method in paths[path]) {
        console.log(`  ${method.toUpperCase()}: ${paths[path][method].summary || paths[path][method].description || ''}`);
      }
    }
  }

  await prisma.$disconnect();
}

getApiDocs().catch(console.error);
