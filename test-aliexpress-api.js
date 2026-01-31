/**
 * SCRIPT DE TESTES - API ALIEXPRESS DS
 * 
 * Este script testa várias operações da API do AliExpress Dropshipping
 * para entender os erros reais que a API retorna.
 * 
 * USO: node test-aliexpress-api.js
 */

const crypto = require('crypto')

// ============================================================
// CONFIGURAÇÃO - Preencher com suas credenciais
// ============================================================

const CONFIG = {
  appKey: '',      // Será carregado do banco
  appSecret: '',   // Será carregado do banco
  accessToken: '', // Será carregado do banco
  apiUrl: 'https://api-sg.aliexpress.com/sync',
}

// Produto de teste (alterar conforme necessário)
const TEST_PRODUCT_ID = '1005007517611251' // Panela Magalu Store

// Endereço de teste
const TEST_ADDRESS = {
  recipientName: 'Cliente Teste',
  phone: '98988776655', // 10-11 dígitos SEM código do país
  countryCode: 'BR',
  province: 'Maranhao',
  city: 'Sao Luis',
  address: 'Rua Teste 123, Centro',
  zipcode: '65000000',
  cpf: '12345678900',
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function generateSign(params, appSecret) {
  const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort()
  const signString = sortedKeys.map(k => `${k}${params[k]}`).join('')
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase()
}

async function callAPI(method, extraParams = {}) {
  const timestamp = Date.now().toString()
  
  const params = {
    app_key: CONFIG.appKey,
    method: method,
    session: CONFIG.accessToken,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    ...extraParams,
  }
  
  params.sign = generateSign(params, CONFIG.appSecret)
  
  const url = `${CONFIG.apiUrl}?${new URLSearchParams(params).toString()}`
  
  console.log(`\n📡 Chamando: ${method}`)
  console.log(`   Params:`, Object.keys(extraParams).length > 0 ? extraParams : '(nenhum)')
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    const data = await response.json()
    return data
  } catch (error) {
    return { error: error.message }
  }
}

function printResult(testName, data) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📋 ${testName}`)
  console.log('='.repeat(60))
  
  if (data.error_response) {
    console.log('❌ ERRO DA API:')
    console.log(`   Código: ${data.error_response.code}`)
    console.log(`   Mensagem: ${data.error_response.msg}`)
    if (data.error_response.sub_msg) {
      console.log(`   Sub-mensagem: ${data.error_response.sub_msg}`)
    }
    if (data.error_response.sub_code) {
      console.log(`   Sub-código: ${data.error_response.sub_code}`)
    }
  } else {
    // Encontrar a resposta dentro do objeto
    const responseKey = Object.keys(data).find(k => k.includes('_response'))
    if (responseKey) {
      const result = data[responseKey]?.result || data[responseKey]
      
      if (result?.error_code) {
        console.log('⚠️ ERRO NO RESULT:')
        console.log(`   Código: ${result.error_code}`)
        console.log(`   Mensagem: ${result.error_msg || 'N/A'}`)
      } else if (result?.is_success === false) {
        console.log('⚠️ OPERAÇÃO FALHOU:')
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log('✅ SUCESSO:')
        console.log(JSON.stringify(result, null, 2).substring(0, 1000))
        if (JSON.stringify(result).length > 1000) {
          console.log('   ... (resposta truncada)')
        }
      }
    } else {
      console.log('📦 RESPOSTA COMPLETA:')
      console.log(JSON.stringify(data, null, 2).substring(0, 1000))
    }
  }
}

// ============================================================
// TESTES
// ============================================================

async function test1_VerifyCredentials() {
  // Teste básico: buscar um produto para verificar se as credenciais funcionam
  const data = await callAPI('aliexpress.ds.product.wholesale.get', {
    product_id: TEST_PRODUCT_ID,
    ship_to_country: 'BR',
  })
  printResult('TESTE 1: Verificar Credenciais (Buscar Produto)', data)
  return !data.error_response || data.error_response.code !== 'Invalid-AppKey'
}

async function test2_GetProductInfo() {
  // Buscar informações do produto na lista DS
  const data = await callAPI('aliexpress.ds.product.wholesale.get', {
    product_id: TEST_PRODUCT_ID,
    ship_to_country: 'BR',
  })
  printResult('TESTE 2: Buscar Produto na Lista DS', data)
  
  // Extrair informações úteis
  const result = data.aliexpress_ds_product_wholesale_get_response?.result
  if (result) {
    console.log('\n📊 INFORMAÇÕES DO PRODUTO:')
    console.log(`   Nome: ${result.ae_item_base_info_dto?.subject || 'N/A'}`)
    console.log(`   Loja: ${result.ae_store_info?.store_name || 'N/A'}`)
    console.log(`   País da Loja: ${result.ae_store_info?.store_country_code || 'N/A'}`)
    
    const skus = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
    console.log(`   SKUs disponíveis: ${skus.length}`)
    if (skus.length > 0) {
      console.log(`   Primeiro SKU: ${skus[0].sku_id || skus[0].id}`)
    }
  }
  
  return result
}

async function test3_QueryFreight() {
  // Consultar frete para o produto
  const queryDeliveryReq = {
    productId: TEST_PRODUCT_ID,
    quantity: 1,
    shipToCountry: 'BR',
    address: JSON.stringify(TEST_ADDRESS),
    locale: 'pt_BR',
    currency: 'BRL',
  }
  
  const data = await callAPI('aliexpress.ds.freight.query', {
    queryDeliveryReq: JSON.stringify(queryDeliveryReq),
  })
  printResult('TESTE 3: Consultar Frete (Freight Query)', data)
  
  // Extrair opções de frete
  const result = data.aliexpress_ds_freight_query_response?.result
  if (result?.success) {
    const options = result.delivery_options?.delivery_option_d_t_o || []
    console.log(`\n📦 OPÇÕES DE FRETE (${options.length}):`)
    options.forEach((opt, i) => {
      console.log(`   ${i+1}. ${opt.service_name} - ${opt.shipping_fee_format || 'Grátis'} - ${opt.delivery_date_desc || 'N/A'}`)
    })
    return options[0]?.service_name
  }
  return null
}

async function test4_CreateOrder_Simple() {
  // Criar pedido SEM logistics_service_name (deixar AliExpress escolher)
  const deliveryAddress = TEST_ADDRESS
  const productItems = [
    {
      product_id: TEST_PRODUCT_ID,
      product_count: 1,
    }
  ]
  
  const data = await callAPI('aliexpress.ds.order.create', {
    delivery_address: JSON.stringify(deliveryAddress),
    product_items: JSON.stringify(productItems),
  })
  printResult('TESTE 4: Criar Pedido (Simples - Sem Logistics)', data)
  return data
}

async function test5_CreateOrder_WithLogistics(logisticsName) {
  // Criar pedido COM logistics_service_name
  if (!logisticsName) {
    console.log('\n⚠️ TESTE 5 PULADO: Nenhum método de frete disponível')
    return null
  }
  
  const deliveryAddress = TEST_ADDRESS
  const productItems = [
    {
      product_id: TEST_PRODUCT_ID,
      product_count: 1,
      logistics_service_name: logisticsName,
    }
  ]
  
  const data = await callAPI('aliexpress.ds.order.create', {
    delivery_address: JSON.stringify(deliveryAddress),
    product_items: JSON.stringify(productItems),
  })
  printResult(`TESTE 5: Criar Pedido (Com Logistics: ${logisticsName})`, data)
  return data
}

async function test6_CreateOrder_WrongProduct() {
  // Tentar criar pedido com produto inexistente
  const deliveryAddress = TEST_ADDRESS
  const productItems = [
    {
      product_id: '9999999999999999', // Produto que não existe
      product_count: 1,
    }
  ]
  
  const data = await callAPI('aliexpress.ds.order.create', {
    delivery_address: JSON.stringify(deliveryAddress),
    product_items: JSON.stringify(productItems),
  })
  printResult('TESTE 6: Criar Pedido (Produto Inválido)', data)
  return data
}

async function test7_CreateOrder_WrongAddress() {
  // Tentar criar pedido com endereço inválido
  const deliveryAddress = {
    recipientName: 'Teste',
    phone: '123', // Telefone inválido
    countryCode: 'XX', // País inválido
    province: '',
    city: '',
    address: '',
    zipcode: '00000', // CEP inválido
  }
  const productItems = [
    {
      product_id: TEST_PRODUCT_ID,
      product_count: 1,
    }
  ]
  
  const data = await callAPI('aliexpress.ds.order.create', {
    delivery_address: JSON.stringify(deliveryAddress),
    product_items: JSON.stringify(productItems),
  })
  printResult('TESTE 7: Criar Pedido (Endereço Inválido)', data)
  return data
}

async function test8_ListOrders() {
  // Listar pedidos existentes
  const data = await callAPI('aliexpress.ds.order.list.get', {
    page: '1',
    page_size: '5',
  })
  printResult('TESTE 8: Listar Pedidos DS', data)
  return data
}

async function test9_GetOrderDetails(orderId) {
  // Buscar detalhes de um pedido
  if (!orderId) {
    console.log('\n⚠️ TESTE 9 PULADO: Nenhum orderId fornecido')
    return null
  }
  
  const data = await callAPI('aliexpress.ds.order.get', {
    order_id: orderId,
  })
  printResult(`TESTE 9: Detalhes do Pedido ${orderId}`, data)
  return data
}

async function test10_ListLogisticsServices() {
  // Listar serviços de logística disponíveis
  const data = await callAPI('aliexpress.logistics.redefining.listlogisticsservice', {
    countryCode: 'BR',
  })
  printResult('TESTE 10: Listar Serviços de Logística (BR)', data)
  return data
}

async function test11_AlternativeOrderFormat() {
  // Tentar formato correto (param_place_order_request4_open_api_d_t_o)
  const placeOrderRequest = {
    product_items: [
      {
        product_id: TEST_PRODUCT_ID,
        product_count: 1,
      }
    ],
    logistics_address: {
      address: TEST_ADDRESS.address,
      address2: '',
      city: TEST_ADDRESS.city,
      contact_person: TEST_ADDRESS.recipientName,
      country: 'BR',
      full_name: TEST_ADDRESS.recipientName,
      mobile_no: TEST_ADDRESS.phone, // Apenas 10-11 dígitos
      phone_country: '55',
      province: TEST_ADDRESS.province,
      zip: TEST_ADDRESS.zipcode,
      cpf: TEST_ADDRESS.cpf,
    },
  }
  
  const data = await callAPI('aliexpress.ds.order.create', {
    param_place_order_request4_open_api_d_t_o: JSON.stringify(placeOrderRequest),
  })
  printResult('TESTE 11: Criar Pedido (Formato Correto)', data)
  return data
}

// ============================================================
// CARREGAR CREDENCIAIS DO BANCO
// ============================================================

async function loadCredentials() {
  const mysql = require('mysql2/promise')
  
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ecommerce',
    })
    
    const [rows] = await connection.execute('SELECT * FROM AliExpressAuth LIMIT 1')
    await connection.end()
    
    if (rows.length > 0) {
      CONFIG.appKey = rows[0].appKey
      CONFIG.appSecret = rows[0].appSecret
      CONFIG.accessToken = rows[0].accessToken
      console.log('✅ Credenciais carregadas do banco de dados')
      console.log(`   App Key: ${CONFIG.appKey}`)
      console.log(`   Access Token: ${CONFIG.accessToken?.substring(0, 20)}...`)
      return true
    } else {
      console.log('❌ Nenhuma credencial encontrada no banco')
      return false
    }
  } catch (error) {
    console.log('⚠️ Erro ao carregar do banco:', error.message)
    console.log('   Tentando usar credenciais hardcoded...')
    
    // Fallback: credenciais hardcoded (preencher manualmente)
    if (!CONFIG.appKey) {
      console.log('❌ Configure as credenciais no início do arquivo')
      return false
    }
    return true
  }
}

// ============================================================
// EXECUTAR TESTES
// ============================================================

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     SCRIPT DE TESTES - API ALIEXPRESS DS                  ║')
  console.log('║     Testando várias operações para entender erros         ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`🎯 Produto de Teste: ${TEST_PRODUCT_ID}`)
  console.log(`📍 Endereço de Teste: ${TEST_ADDRESS.city}, ${TEST_ADDRESS.province}`)
  console.log('')
  
  // Carregar credenciais
  const hasCredentials = await loadCredentials()
  if (!hasCredentials) {
    console.log('\n❌ ABORTANDO: Sem credenciais válidas')
    return
  }
  
  console.log('\n' + '═'.repeat(60))
  console.log('INICIANDO TESTES...')
  console.log('═'.repeat(60))
  
  // Executar testes em sequência
  const results = {}
  
  // Teste 1: Credenciais
  results.credentials = await test1_VerifyCredentials()
  
  if (!results.credentials) {
    console.log('\n❌ ABORTANDO: Credenciais inválidas ou expiradas')
    console.log('   Renove o access_token em: https://open.aliexpress.com/')
    return
  }
  
  // Teste 2: Produto
  results.product = await test2_GetProductInfo()
  
  // Teste 3: Frete
  results.freight = await test3_QueryFreight()
  
  // Teste 4: Criar pedido simples
  results.orderSimple = await test4_CreateOrder_Simple()
  
  // Teste 5: Criar pedido com logistics
  results.orderWithLogistics = await test5_CreateOrder_WithLogistics(results.freight)
  
  // Teste 6: Produto inválido
  results.orderWrongProduct = await test6_CreateOrder_WrongProduct()
  
  // Teste 7: Endereço inválido
  results.orderWrongAddress = await test7_CreateOrder_WrongAddress()
  
  // Teste 8: Listar pedidos
  results.orderList = await test8_ListOrders()
  
  // Teste 10: Serviços de logística
  results.logistics = await test10_ListLogisticsServices()
  
  // Teste 11: Formato alternativo
  results.orderAlternative = await test11_AlternativeOrderFormat()
  
  // Resumo final
  console.log('\n' + '═'.repeat(60))
  console.log('📊 RESUMO DOS TESTES')
  console.log('═'.repeat(60))
  console.log('')
  console.log('Os erros acima mostram exatamente o que a API retorna.')
  console.log('Use essas informações para ajustar o código de integração.')
  console.log('')
}

// Executar
runTests().catch(console.error)
