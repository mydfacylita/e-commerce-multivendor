const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

async function testProductPrice() {
  const prisma = new PrismaClient();
  
  try {
    const auth = await prisma.aliExpressAuth.findFirst();
    if (!auth) { 
      console.log('Sem auth'); 
      return; 
    }
    
    // Verificar produto no banco
    const product = await prisma.product.findFirst({
      where: { supplierSku: '1005007517611251' },
      select: { id: true, name: true, supplierSku: true, costPrice: true, price: true }
    });
    
    console.log('Produto no banco:', JSON.stringify(product, null, 2));
    console.log('');

    const productId = '1005007517611251'; // Testar SKU específica
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    const params = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.product.get',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      product_id: productId,
      target_currency: 'BRL',
      target_language: 'pt',
      ship_to_country: 'BR'
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

testProductPrice();
