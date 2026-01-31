const fetch = require('node-fetch');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

async function testFreightQuery() {
  const client = new PrismaClient();
  const auth = await client.aliExpressAuth.findFirst();
  
  if (!auth) {
    console.log('Sem credenciais');
    return;
  }
  
  const apiUrl = 'https://api-sg.aliexpress.com/sync';
  const timestamp = Date.now().toString();
  
  // Teste 1: Com acento (como vem do ViaCEP)
  const addressComAcento = {
    country: 'BR',
    province: 'Maranhão',
    city: 'São Luís',
    district: 'Turu',
    zipCode: '65067380',
    addressLine1: 'rua do retiro natal BL 04 APT 102',
    recipientName: 'Cliente'
  };
  
  // Teste 2: Sem acento (como deveria ser para AliExpress)
  const addressSemAcento = {
    country: 'BR',
    province: 'Maranhao',
    city: 'Sao Luis',
    district: 'Turu',
    zipCode: '65067380',
    addressLine1: 'rua do retiro natal BL 04 APT 102',
    recipientName: 'Cliente'
  };
  
  async function testAddress(addressObj, label) {
    console.log(`\n=== TESTE: ${label} ===`);
    console.log('Address:', JSON.stringify(addressObj));
    
    const queryDeliveryReq = {
      productId: '1005007517611251',
      quantity: 1,
      shipToCountry: 'BR',
      address: JSON.stringify(addressObj),
      selectedSkuId: '12000041099748778',
      locale: 'pt_BR',
      language: 'pt_BR',
      currency: 'BRL',
    };
    
    const params = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.freight.query',
      session: auth.accessToken,
      timestamp: Date.now().toString(),
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      queryDeliveryReq: JSON.stringify(queryDeliveryReq),
    };
    
    const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort();
    const signString = sortedKeys.map(k => k + params[k]).join('');
    const sign = crypto.createHmac('sha256', auth.appSecret).update(signString).digest('hex').toUpperCase();
    params.sign = sign;
    
    const url = apiUrl + '?' + new URLSearchParams(params).toString();
    const res = await fetch(url);
    const data = await res.json();
    
    const result = data.aliexpress_ds_freight_query_response?.result;
    if (result?.success) {
      console.log('✅ SUCESSO!');
      const options = result.delivery_options?.delivery_option_d_t_o || [];
      console.log('Opções de frete:', options.length);
      options.forEach(opt => {
        console.log(`  - ${opt.company}: R$ ${opt.shipping_fee_cent} (${opt.delivery_date_desc})`);
      });
    } else {
      console.log('❌ ERRO:', result?.code, result?.msg);
    }
  }
  
  await testAddress(addressComAcento, 'COM ACENTO');
  await testAddress(addressSemAcento, 'SEM ACENTO');
  
  await client.$disconnect();
}

testFreightQuery().catch(console.error);
