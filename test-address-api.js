const fetch = require('node-fetch');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

async function testAddressAPI() {
  const client = new PrismaClient();
  const auth = await client.aliExpressAuth.findFirst();
  
  if (!auth) {
    console.log('Sem credenciais');
    return;
  }
  
  const apiUrl = 'https://api-sg.aliexpress.com/sync';
  const timestamp = Date.now().toString();
  
  const params = {
    app_key: auth.appKey,
    method: 'aliexpress.ds.address.get',
    session: auth.accessToken,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    countryCode: 'BR',
  };
  
  const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort();
  const signString = sortedKeys.map(k => k + params[k]).join('');
  const sign = crypto.createHmac('sha256', auth.appSecret).update(signString).digest('hex').toUpperCase();
  params.sign = sign;
  
  const url = apiUrl + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url);
  const data = await res.json();
  
  const addressData = data.aliexpress_ds_address_get_response?.result?.data;
  if (addressData && addressData.children) {
    // children vem como string JSON, precisa parsear
    const states = typeof addressData.children === 'string' 
      ? JSON.parse(addressData.children) 
      : addressData.children;
    
    console.log('=== TODOS OS ESTADOS DO BRASIL ===');
    states.forEach(s => console.log(`- ${s.name}`));
    
    // Buscar Maranhão
    const maranhao = states.find(s => s.name.toLowerCase().includes('maranh'));
    if (maranhao) {
      console.log('\n=== MARANHÃO ENCONTRADO ===');
      console.log('Nome exato:', maranhao.name);
      console.log('Tem filhos:', maranhao.hasChildren);
      
      // children também é string
      const cities = typeof maranhao.children === 'string' 
        ? JSON.parse(maranhao.children) 
        : maranhao.children;
      
      if (cities) {
        // Buscar todas as cidades que contém "Sao" ou "Luis"
        console.log('\n=== CIDADES DO MARANHÃO COM "SAO" ===');
        const cidadesSao = cities.filter(c => c.name.toLowerCase().startsWith('sao'));
        cidadesSao.forEach(c => console.log(`  - ${c.name}`));
        
        const saoLuis = cities.find(c => c.name === 'Sao Luis');
        if (saoLuis) {
          console.log('\n=== SÃO LUÍS ENCONTRADO ===');
          console.log('Nome exato:', saoLuis.name);
        } else {
          console.log('\nSao Luis NÃO encontrado com esse nome exato');
        }
      }
    } else {
      console.log('\nMaranhão não encontrado. Estados disponíveis:');
      states.slice(0, 10).forEach(s => console.log(`  - ${s.name}`));
    }
  } else {
    console.log('Resposta:', JSON.stringify(data, null, 2).substring(0, 1000));
  }
  
  await client.$disconnect();
}

testAddressAPI().catch(console.error);
