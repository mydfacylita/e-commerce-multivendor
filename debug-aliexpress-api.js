const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function debugAliExpressAPI() {
  try {
    console.log('🔍 Debug da API AliExpress...\n');

    // 1. Verificar credenciais no banco
    const auth = await prisma.aliExpressAuth.findFirst();
    
    if (!auth) {
      console.log('❌ Nenhuma credencial encontrada no banco!');
      return;
    }

    console.log('✅ Credenciais encontradas:');
    console.log('- AppKey:', auth.appKey);
    console.log('- AppSecret:', auth.appSecret ? auth.appSecret.substring(0, 10) + '...' : 'NÃO CONFIGURADO');
    console.log('- AccessToken:', auth.accessToken ? auth.accessToken.substring(0, 20) + '...' : 'NÃO AUTORIZADO');
    console.log('- Expira em:', auth.expiresAt);

    if (!auth.accessToken) {
      console.log('❌ Access Token não encontrado. Execute o OAuth primeiro!');
      return;
    }

    // Verificar se token expirou
    if (auth.expiresAt && new Date() > auth.expiresAt) {
      console.log('⚠️ Access Token EXPIRADO! Precisa renovar OAuth.');
      return;
    }

    // 2. Testar busca de produtos
    console.log('\n🌐 Testando busca de produtos...');
    
    const apiUrl = 'https://api-sg.aliexpress.com/sync';
    const timestamp = Date.now().toString();

    const params = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.text.search',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      keywords: 'wireless headphones',
      countryCode: 'BR',
      currency: 'BRL',
      language: 'pt',
      local: 'pt_BR',
      page_no: '1',
      page_size: '5',
      sort: 'SALE_PRICE_ASC',
      ship_to_country: 'BR',
      min_price: '8',
    };

    // Gerar assinatura
    function generateSign(appSecret, params) {
      const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort();
      const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
      return crypto.createHmac('sha256', appSecret)
        .update(signString)
        .digest('hex')
        .toUpperCase();
    }

    const sign = generateSign(auth.appSecret, params);
    params.sign = sign;

    console.log('📋 Parâmetros da requisição:');
    console.log('- Method:', params.method);
    console.log('- Keywords:', params.keywords);
    console.log('- Country:', params.countryCode);
    console.log('- Currency:', params.currency);
    console.log('- Page Size:', params.page_size);
    console.log('- Signature:', sign.substring(0, 20) + '...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(params).toString()
    });

    console.log('\n📥 Resposta da API:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);

    const data = await response.json();

    if (data.error_response) {
      console.log('\n❌ ERRO na resposta:');
      console.log('- Code:', data.error_response.code);
      console.log('- Message:', data.error_response.msg);
      console.log('- Request ID:', data.error_response.request_id);
      
      if (data.error_response.code === 'Invalid signature') {
        console.log('\n🔧 Possíveis soluções:');
        console.log('1. Verificar AppSecret');
        console.log('2. Verificar método de geração da assinatura');
        console.log('3. Verificar encoding dos parâmetros');
      }
      
      if (data.error_response.code === 'Invalid session') {
        console.log('\n🔧 Token expirado ou inválido!');
        console.log('Execute o OAuth novamente em /admin/integracao/aliexpress');
      }
    } else {
      console.log('\n✅ SUCESSO! Resposta da API:');
      
      // Verificar estrutura da resposta
      console.log('📋 Estrutura da resposta:', Object.keys(data));
      
      let products = [];
      if (data.aliexpress_ds_text_search_response?.data?.products?.selection_search_product) {
        products = data.aliexpress_ds_text_search_response.data.products.selection_search_product;
      }
      
      console.log('📦 Produtos encontrados:', products.length);
      
      if (products.length > 0) {
        console.log('\n📋 Primeiros produtos:');
        products.slice(0, 3).forEach((product, i) => {
          console.log(`${i+1}. ${product.title} - $${product.targetSalePrice}`);
          console.log(`   ID: ${product.itemId}`);
        });
      } else {
        console.log('⚠️ Nenhum produto encontrado. Possíveis causas:');
        console.log('1. Conta em modo sandbox');
        console.log('2. Aplicação não aprovada ainda');
        console.log('3. Nenhum produto disponível para os filtros');
      }
    }

  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugAliExpressAPI();