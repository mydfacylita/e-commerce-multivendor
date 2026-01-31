const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

async function checkOrder() {
  const prisma = new PrismaClient();
  
  try {
    const auth = await prisma.aliExpressAuth.findFirst();
    if (!auth) { 
      console.log('Sem auth'); 
      return; 
    }
    
    const aliexpressOrderId = '8208139373025015';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    const params = {
      app_key: auth.appKey,
      method: 'aliexpress.trade.ds.order.get',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      single_order_query: JSON.stringify({ order_id: aliexpressOrderId })
    };

    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map(key => key + params[key]).join('');
    const sign = crypto.createHmac('sha256', auth.appSecret).update(signString).digest('hex').toUpperCase();
    params.sign = sign;

    const url = 'https://api-sg.aliexpress.com/sync?' + new URLSearchParams(params).toString();
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Resposta completa do AliExpress:');
    console.log(JSON.stringify(data, null, 2));
    
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
