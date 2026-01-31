/**
 * Script de Teste Completo para API AliExpress DS
 * Objetivo: Diagnosticar e resolver erros de criação de pedido
 */

const crypto = require('crypto');
const mysql = require('mysql2/promise');

// Configurações do teste
const CONFIG = {
  productId: '1005007517611251',
  skuId: '12000041099748778',
  
  // Endereço de teste
  address: {
    recipientName: 'Cliente Teste',
    phone: '98988776655',
    city: 'Sao Luis',
    province: 'Maranhao',
    street: 'Rua Teste 123',
    district: 'Centro',
    zip: '65000000',
    cpf: '52998224725',
  }
};

// Função para gerar assinatura
function generateSign(params, appSecret) {
  const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort();
  const signString = sortedKeys.map(k => `${k}${params[k]}`).join('');
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase();
}

// Função para chamar API
async function callAPI(auth, method, extraParams = {}) {
  const params = {
    app_key: auth.appKey,
    method: method,
    session: auth.accessToken,
    timestamp: Date.now().toString(),
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    ...extraParams
  };
  
  params.sign = generateSign(params, auth.appSecret);
  
  const url = `https://api-sg.aliexpress.com/sync?${new URLSearchParams(params).toString()}`;
  const response = await fetch(url);
  return await response.json();
}

async function main() {
  console.log('='.repeat(70));
  console.log('    SCRIPT DE DIAGNÓSTICO - API ALIEXPRESS DS');
  console.log('='.repeat(70));
  
  // Conectar ao banco
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecommerce'
  });
  
  const [rows] = await conn.execute('SELECT * FROM AliExpressAuth LIMIT 1');
  await conn.end();
  
  if (!rows.length) {
    console.log('❌ Credenciais AliExpress não encontradas');
    return;
  }
  
  const auth = rows[0];
  console.log(`\n✅ Credenciais carregadas: App Key = ${auth.appKey.substring(0, 8)}...`);
  
  // ============================================================
  // TESTE 1: Consultar frete disponível
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 1: Consultar métodos de frete (ds.freight.query)');
  console.log('='.repeat(70));
  
  const queryDeliveryReq = {
    productId: CONFIG.productId,
    quantity: 1,
    selectedSkuId: CONFIG.skuId,
    shipToCountry: 'BR',
    language: 'pt_BR',
    locale: 'pt_BR',
    currency: 'BRL',
    address: JSON.stringify({
      city: CONFIG.address.city,
      province: CONFIG.address.province,
      country: 'BR',
      zip: CONFIG.address.zip
    })
  };
  
  const freightData = await callAPI(auth, 'aliexpress.ds.freight.query', {
    queryDeliveryReq: JSON.stringify(queryDeliveryReq)
  });
  
  let availableMethods = [];
  const freightResult = freightData.aliexpress_ds_freight_query_response?.result;
  
  if (freightResult?.success) {
    const options = freightResult.delivery_options?.delivery_option_d_t_o || [];
    console.log(`\n✅ ${options.length} métodos de frete encontrados:\n`);
    
    options.forEach((opt, i) => {
      availableMethods.push({
        code: opt.code,
        serviceName: opt.service_name,
        company: opt.company,
        cost: opt.shipping_fee_format || opt.shipping_fee_cent,
        days: opt.delivery_date_desc,
        free: opt.free_shipping
      });
      
      console.log(`[${i+1}] ${opt.code}`);
      console.log(`    service_name: ${opt.service_name}`);
      console.log(`    company: ${opt.company}`);
      console.log(`    custo: ${opt.shipping_fee_format || opt.shipping_fee_cent}`);
      console.log(`    prazo: ${opt.delivery_date_desc}`);
      console.log(`    gratis: ${opt.free_shipping}`);
      console.log('');
    });
    
    // Verificar se MAGALU_BRLOCAL está na lista
    const hasMagalu = options.some(o => o.code === 'MAGALU_BRLOCAL');
    console.log(`🔍 MAGALU_BRLOCAL disponível: ${hasMagalu ? '✅ SIM' : '❌ NÃO'}`);
    
  } else {
    console.log('❌ Erro na consulta de frete:');
    console.log(JSON.stringify(freightData, null, 2));
  }
  
  // ============================================================
  // TESTE 2: Validar endereço com ds.address.get
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 2: Validar endereço (ds.address.get)');
  console.log('='.repeat(70));
  
  const addressData = await callAPI(auth, 'aliexpress.ds.address.get', {});
  
  if (addressData.error_response) {
    console.log('❌ Erro:', addressData.error_response.code, '-', addressData.error_response.msg);
    console.log('   (Esta API pode não estar disponível para sua conta)');
  } else {
    console.log('✅ Resposta:');
    console.log(JSON.stringify(addressData, null, 2));
  }
  
  // ============================================================
  // TESTE 3: Criar pedido SEM logistics_service_name
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 3: Criar pedido SEM logistics_service_name');
  console.log('='.repeat(70));
  
  const orderRequest1 = {
    product_items: [{
      product_id: CONFIG.productId,
      product_count: 1,
      sku_id: CONFIG.skuId,
    }],
    logistics_address: {
      address: CONFIG.address.street,
      address2: CONFIG.address.district,
      city: CONFIG.address.city,
      contact_person: CONFIG.address.recipientName,
      country: 'BR',
      full_name: CONFIG.address.recipientName,
      mobile_no: CONFIG.address.phone,
      phone_country: '55',
      province: CONFIG.address.province,
      zip: CONFIG.address.zip,
      cpf: CONFIG.address.cpf,
    },
  };
  
  console.log('\nPayload enviado:');
  console.log(JSON.stringify(orderRequest1, null, 2));
  
  const orderData1 = await callAPI(auth, 'aliexpress.ds.order.create', {
    param_place_order_request4_open_api_d_t_o: JSON.stringify(orderRequest1)
  });
  
  const result1 = orderData1.aliexpress_ds_order_create_response?.result;
  if (result1?.order_id) {
    console.log('\n✅ PEDIDO CRIADO COM SUCESSO!');
    console.log('   Order ID:', result1.order_id);
  } else if (result1?.error_code) {
    console.log('\n❌ Erro:', result1.error_code);
    console.log('   Mensagem:', result1.error_msg);
  } else if (orderData1.error_response) {
    console.log('\n❌ Erro API:', orderData1.error_response.code);
    console.log('   Mensagem:', orderData1.error_response.msg);
  } else {
    console.log('\n❓ Resposta inesperada:');
    console.log(JSON.stringify(orderData1, null, 2));
  }
  
  // ============================================================
  // TESTE 4: Criar pedido COM cada método de frete disponível
  // ============================================================
  if (availableMethods.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('TESTE 4: Testar cada método de frete disponível');
    console.log('='.repeat(70));
    
    for (const method of availableMethods) {
      console.log(`\n🔄 Testando método: ${method.code} (${method.serviceName})`);
      
      const orderRequest = {
        product_items: [{
          product_id: CONFIG.productId,
          product_count: 1,
          sku_id: CONFIG.skuId,
          logistics_service_name: method.serviceName, // Usar service_name, não code
        }],
        logistics_address: {
          address: CONFIG.address.street,
          address2: CONFIG.address.district,
          city: CONFIG.address.city,
          contact_person: CONFIG.address.recipientName,
          country: 'BR',
          full_name: CONFIG.address.recipientName,
          mobile_no: CONFIG.address.phone,
          phone_country: '55',
          province: CONFIG.address.province,
          zip: CONFIG.address.zip,
          cpf: CONFIG.address.cpf,
        },
      };
      
      const orderData = await callAPI(auth, 'aliexpress.ds.order.create', {
        param_place_order_request4_open_api_d_t_o: JSON.stringify(orderRequest)
      });
      
      const result = orderData.aliexpress_ds_order_create_response?.result;
      if (result?.order_id) {
        console.log(`   ✅ SUCESSO! Order ID: ${result.order_id}`);
        break; // Parar no primeiro sucesso
      } else if (result?.error_code) {
        console.log(`   ❌ ${result.error_code}: ${result.error_msg}`);
      } else if (orderData.error_response) {
        console.log(`   ❌ ${orderData.error_response.code}: ${orderData.error_response.msg}`);
      }
      
      // Aguardar 1 segundo entre requisições
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // ============================================================
  // TESTE 5: Testar formato alternativo (delivery_address + product_items)
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 5: Formato alternativo (delivery_address + product_items separados)');
  console.log('='.repeat(70));
  
  const deliveryAddress = {
    recipientName: CONFIG.address.recipientName,
    phone: `+55${CONFIG.address.phone}`,
    countryCode: 'BR',
    province: CONFIG.address.province,
    city: CONFIG.address.city,
    address: `${CONFIG.address.street}, ${CONFIG.address.district}`,
    zipcode: CONFIG.address.zip,
    cpf: CONFIG.address.cpf,
  };
  
  const productItems = [{
    product_id: CONFIG.productId,
    product_count: 1,
  }];
  
  console.log('\ndelivery_address:', JSON.stringify(deliveryAddress, null, 2));
  console.log('\nproduct_items:', JSON.stringify(productItems, null, 2));
  
  const orderData5 = await callAPI(auth, 'aliexpress.ds.order.create', {
    delivery_address: JSON.stringify(deliveryAddress),
    product_items: JSON.stringify(productItems),
  });
  
  const result5 = orderData5.aliexpress_ds_order_create_response?.result;
  if (result5?.order_id) {
    console.log('\n✅ SUCESSO! Order ID:', result5.order_id);
  } else if (result5?.error_code) {
    console.log('\n❌ Erro:', result5.error_code);
    console.log('   Mensagem:', result5.error_msg);
  } else if (orderData5.error_response) {
    console.log('\n❌ Erro API:', orderData5.error_response.code);
    console.log('   Mensagem:', orderData5.error_response.msg);
  } else {
    console.log('\n❓ Resposta:');
    console.log(JSON.stringify(orderData5, null, 2));
  }
  
  // ============================================================
  // RESUMO
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('RESUMO DOS TESTES');
  console.log('='.repeat(70));
  console.log(`
📦 Produto: ${CONFIG.productId}
📍 Endereço: ${CONFIG.address.city}, ${CONFIG.address.province}
📬 CEP: ${CONFIG.address.zip}

Métodos de frete disponíveis: ${availableMethods.length}
${availableMethods.map(m => `  - ${m.code} (${m.serviceName})`).join('\n')}
  `);
}

main().catch(e => {
  console.error('ERRO FATAL:', e.message);
  console.error(e.stack);
});
