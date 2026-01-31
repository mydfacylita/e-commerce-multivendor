/**
 * Script para testar diferentes métodos de tracking do AliExpress
 */

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const orderId = '8208376838605015';
const trackingNo = '1507670097738968';

async function test() {
  const prisma = new PrismaClient();
  const auth = await prisma.aliExpressAuth.findFirst();
  
  function sign(params, secret) {
    const sorted = Object.keys(params).filter(k => k !== 'sign').sort();
    const str = sorted.map(k => k + params[k]).join('');
    return crypto.createHmac('sha256', secret).update(str).digest('hex').toUpperCase();
  }
  
  async function callAPI(method, extraParams = {}) {
    const params = {
      app_key: auth.appKey,
      session: auth.accessToken,
      method: method,
      sign_method: 'sha256',
      timestamp: Date.now().toString(),
      v: '2.0',
      format: 'json',
      ...extraParams
    };
    params.sign = sign(params, auth.appSecret);
    
    const res = await fetch('https://api-sg.aliexpress.com/sync?' + new URLSearchParams(params));
    return await res.json();
  }

  console.log('=== Testando aliexpress.ds.order.tracking.get ===\n');

  // 1. Com ae_order_id e language pt_BR
  console.log('1. com ae_order_id + language pt_BR');
  let data = await callAPI('aliexpress.ds.order.tracking.get', { 
    ae_order_id: orderId,
    language: 'pt_BR'
  });
  console.log(JSON.stringify(data, null, 2));

  // 2. Com ae_order_id e language en_US
  console.log('\n2. com ae_order_id + language en_US');
  data = await callAPI('aliexpress.ds.order.tracking.get', { 
    ae_order_id: orderId,
    language: 'en_US'
  });
  console.log(JSON.stringify(data, null, 2));

  // 3. aliexpress.trade.order.logisticsinfo.get
  console.log('\n3. aliexpress.trade.order.logisticsinfo.get');
  data = await callAPI('aliexpress.trade.order.logisticsinfo.get', { order_id: orderId });
  console.log(JSON.stringify(data, null, 2));

  // 4. aliexpress.logistics.buyer.tracking.get (compradores)
  console.log('\n4. aliexpress.logistics.buyer.tracking.get');
  data = await callAPI('aliexpress.logistics.buyer.tracking.get', { 
    logistics_no: trackingNo,
    origin: 'ESCROW',
    out_ref: orderId
  });
  console.log(JSON.stringify(data, null, 2));

  // 5. Com origin diferente
  console.log('\n5. aliexpress.logistics.ds.trackinginfo.query com origin=AFFILIATE');
  data = await callAPI('aliexpress.logistics.ds.trackinginfo.query', { 
    logistics_no: trackingNo,
    origin: 'AFFILIATE',
    out_ref: orderId,
    service_name: 'MAGALU_BRLOCAL',
    to_area: 'BR'
  });
  console.log(JSON.stringify(data, null, 2));

  await prisma.$disconnect();
}

test().catch(console.error);
