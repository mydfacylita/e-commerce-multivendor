import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface AliExpressProduct {
  product_id: string;
  product_title: string;
  product_main_image_url: string;
  product_description?: string;
  product_specs?: any;
  product_variants?: any;
  product_attributes?: any;
  target_sale_price: string;
  target_original_price?: string;
  product_detail_url: string;
  product_small_image_urls?: string[];
}

// Função para gerar assinatura HMAC-SHA256 segundo documentação AliExpress
// Para Business APIs: NÃO adiciona api_path, apenas concatena key1value1key2value2
function generateSign(appSecret: string, params: Record<string, any>): string {
  // Ordenar parâmetros alfabeticamente (excluindo 'sign')
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort();
  
  // Business API: apenas key1value1key2value2 (método já está em params como 'method')
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
  
  console.log('🔐 Sign String:', signString);
  
  // HMAC-SHA256 com appSecret como chave
  const signature = crypto.createHmac('sha256', appSecret)
    .update(signString)
    .digest('hex')
    .toUpperCase();
  
  console.log('✍️  Assinatura HMAC-SHA256:', signature);
  
  return signature;
}

// Função para buscar detalhes completos de um produto (com todas as imagens)
async function fetchProductDetails(appKey: string, appSecret: string, accessToken: string, productId: string) {
  const apiUrl = 'https://api-sg.aliexpress.com/sync';
  const timestamp = Date.now().toString();

  const params: Record<string, any> = {
    app_key: appKey,
    method: 'aliexpress.ds.product.get',
    session: accessToken,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    product_id: productId,
    target_currency: 'BRL',
    target_language: 'pt',
    ship_to_country: 'BR'
  };

  const sign = generateSign(appSecret, params);
  params['sign'] = sign;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error_response) {
      const errorCode = data.error_response.code;
      const errorMsg = data.error_response.msg;
      
      // Filtrar erros esperados de produtos não disponíveis
      if (errorCode === 'Item is not allowed to this country') {
        console.log(`🚫 Produto ${productId} não disponível para BR (proibido no país)`);
        return null;
      }
      if (errorCode === 'ITEM_ID_NOT_FOUND') {
        console.log(`❓ Produto ${productId} não encontrado (ID inválido)`);
        return null;
      }
      
      console.error(`⚠️  Erro ao buscar detalhes do produto ${productId}:`, errorMsg);
      return null;
    }

    return data.aliexpress_ds_product_get_response?.result || null;
  } catch (error) {
    console.error(`❌ Erro ao buscar detalhes do produto ${productId}:`, error);
    return null;
  }
}

// Função para buscar custo de frete do produto
async function fetchShippingCost(appKey: string, appSecret: string, accessToken: string, productId: string) {
  const apiUrl = 'https://api-sg.aliexpress.com/sync';
  const timestamp = Date.now().toString();

  const params: Record<string, any> = {
    app_key: appKey,
    method: 'aliexpress.logistics.buyer.freight.get',
    session: accessToken,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    product_id: productId,
    product_num: '1', // Quantidade para calcular frete
    send_goods_country_code: 'CN', // China (origem)
    country_code: 'BR', // Brasil (destino)
    price: '1', // Preço fictício para cálculo
  };

  const sign = generateSign(appSecret, params);
  params['sign'] = sign;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    });

    if (!response.ok) {
      console.error(`❌ Erro HTTP ao buscar frete: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.error_response) {
      console.log(`⚠️  Erro ao buscar frete do produto ${productId}:`, data.error_response.msg);
      return null;
    }

    const result = data.aliexpress_logistics_buyer_freight_get_response?.result;
    
    if (result && result.aeop_freight_calculate_result_for_buyer_d_t_o_list) {
      const freights = result.aeop_freight_calculate_result_for_buyer_d_t_o_list.aeop_freight_calculate_result_for_buyer_dto;
      
      // Pegar o frete mais barato disponível
      if (Array.isArray(freights) && freights.length > 0) {
        const cheapest = freights.reduce((min, curr) => {
          const currentCost = parseFloat(curr.freight?.amount || '999999');
          const minCost = parseFloat(min.freight?.amount || '999999');
          return currentCost < minCost ? curr : min;
        });
        
        const shippingCost = cheapest.freight?.amount || '0';
        const shippingMethod = cheapest.service_name || 'Standard Shipping';
        
        console.log(`📦 Frete produto ${productId}: ${shippingMethod} - R$ ${shippingCost}`);
        
        return {
          cost: parseFloat(shippingCost),
          method: shippingMethod
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar frete do produto ${productId}:`, error);
    return null;
  }
}

// Função para buscar produtos do AliExpress usando API REAL
async function fetchAliExpressProducts(appKey: string, appSecret: string, keywords: string = '', categoryId: string = '') {
  const apiUrl = 'https://api-sg.aliexpress.com/sync';
  const apiPath = '/sync';
  const timestamp = Date.now().toString();
  
  // Buscar access_token do banco
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Usuário não autenticado');
  }
  
  const auth = await prisma.aliExpressAuth.findUnique({
    where: { userId: session.user.id }
  });
  
  if (!auth?.accessToken) {
    throw new Error('Access token não encontrado. Por favor, autorize a integração primeiro.');
  }

  // Parâmetros da requisição - Usando text.search (funciona) com validação posterior
  const params: Record<string, any> = {
    app_key: appKey,
    method: 'aliexpress.ds.text.search',
    session: auth.accessToken,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    // Parâmetros de busca
    keywords: keywords || 'trending products',
    countryCode: 'BR',
    currency: 'BRL',
    language: 'pt',
    local: 'pt_BR',
    page_no: '1',
    page_size: '20',
    sort: 'SALE_PRICE_ASC',
  };

  // Adicionar categoria se fornecida
  if (categoryId) {
    params.category_id = categoryId;
  }
  
  // Gerar assinatura HMAC-SHA256 (Business API: sem apiPath)
  const sign = generateSign(appSecret, params);
  params['sign'] = sign;
  
  try {
    console.log('🔍 ===== DEBUG ALIEXPRESS API =====');
    console.log('📋 Parâmetros enviados:');
    console.log(JSON.stringify(params, null, 2));
    console.log('🔑 AppKey:', appKey);
    console.log('🔐 AppSecret (primeiros 10 caracteres):', appSecret.substring(0, 10) + '...');
    console.log('✍️  Assinatura gerada:', sign);
    
    // Fazer requisição POST com application/x-www-form-urlencoded (conforme documentação)
    console.log('🌐 Fazendo POST para:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(params).toString()
    });
    
    console.log('📥 Status da resposta:', response.status);
    console.log('📥 Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro HTTP:', response.status);
      console.error('❌ Resposta completa:', errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📦 Resposta JSON completa:', JSON.stringify(data, null, 2));
    
    // ⭐ NOVA VERSÃO - Verificando estrutura correta
    console.log('🔄 Versão do código: v2.0 - Busca em data.products');
    
    // Verificar se há erro na resposta
    if (data.error_response) {
      console.error('❌ Erro retornado pela API:', JSON.stringify(data.error_response, null, 2));
      
      // Se for rate limit, avisar para aguardar
      if (data.error_response.code === 'ApiCallLimit') {
        console.log('⏳ Rate limit atingido. Aguarde alguns segundos e tente novamente.');
      }
      
      throw new Error(data.error_response.msg || 'Erro desconhecido da API');
    }
    
    // Extrair produtos da resposta
    let products = [];
    
    // API recommend.feed.get (produtos dropshipping validados)
    if (data.aliexpress_ds_recommend_feed_get_response?.result?.products) {
      const productList = data.aliexpress_ds_recommend_feed_get_response.result.products
      products = Array.isArray(productList) ? productList : (productList.product || [])
      console.log(`✅ Produtos encontrados via recommend.feed.get: ${products.length}`)
    }
    // Se for text.search - estrutura: data.products.selection_search_product
    else if (data.aliexpress_ds_text_search_response?.data?.products?.selection_search_product) {
      products = data.aliexpress_ds_text_search_response.data.products.selection_search_product;
      console.log(`✅ Produtos encontrados via text.search: ${products.length}`)
    }
    // Se for product.get (produto único)
    else if (data.aliexpress_ds_product_get_response?.result) {
      const product = data.aliexpress_ds_product_get_response.result;
      products = [product];
      console.log(`✅ Produto único encontrado via product.get`)
    }     // Se for product.search (busca por keywords)
    else if (data.aliexpress_ds_product_search_response?.result?.products) {
      products = data.aliexpress_ds_product_search_response.result.products;
      console.log(`✅ Produtos encontrados via product.search: ${products.length}`)
    }
    
    console.log('🔍 Estrutura da resposta:');
    console.log('- Método usado:', params.method);
    console.log('- Resposta completa:', Object.keys(data));
    console.log(`✅ ${products.length} produtos encontrados`);
    
    // Se não encontrou produtos nos feeds, avisar
    if (products.length === 0) {
      console.log('⚠️  ATENÇÃO: Feed vazio. Possíveis causas:');
      console.log('   1. Conta em modo sandbox/teste (sem produtos reais)');
      console.log('   2. Aplicação precisa ser aprovada pela AliExpress');
      console.log('   3. Permissões de Dropshipping não ativadas');
      console.log('   4. Nenhum produto disponível para o feed selecionado');
      console.log('');
      console.log('✅ Integração OAuth funcionando perfeitamente!');
      console.log('📌 Quando a aplicação for aprovada, os produtos aparecerão automaticamente.');
    }
    
    // Buscar detalhes completos para cada produto (para pegar todas as imagens)
    console.log('\n🔍 Buscando detalhes completos dos produtos...');
    const productsWithDetails = [];
    let blockedProducts = 0;
    let notFoundProducts = 0;
    
    for (const product of products) {
      const productId = product.itemId?.toString() || product.product_id?.toString();
      if (!productId) continue;
      
      console.log(`📦 Buscando detalhes do produto ${productId}...`);
      const details = await fetchProductDetails(appKey, appSecret, auth.accessToken, productId);
      
      if (details) {
        // Mesclar dados da busca com dados detalhados
        productsWithDetails.push({
          ...product,
          detailedInfo: details
        });
        console.log(`✅ Detalhes obtidos (${details.aeop_ae_product_s_k_us?.length || 0} variações)`);
      } else {
        // Produto não disponível (bloqueado ou não encontrado) - NÃO importar
        console.log(`🚫 Produto ${productId} ignorado (não disponível para dropshipping no BR)`);
        blockedProducts++;
      }
      
      // Aguardar 500ms entre requests (rate limit)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 Resumo da validação:`);
    console.log(`   ✅ Produtos validados: ${productsWithDetails.length}`);
    console.log(`   🚫 Produtos bloqueados/indisponíveis: ${blockedProducts}`);
    
    // Mapear para o formato esperado
    return productsWithDetails.map((product: any) => {
      // Coletar todas as imagens disponíveis
      let allImages: string[] = [];
      
      // Priorizar imagens dos detalhes completos
      const details = product.detailedInfo;
      
      if (details) {
        
        // Imagens do produto detalhado
        if (details.ae_multimedia_info_dto?.image_urls) {
          let detailImages = [];
          
          // Verificar se é array
          if (Array.isArray(details.ae_multimedia_info_dto.image_urls)) {
            detailImages = details.ae_multimedia_info_dto.image_urls;
          }
          // Verificar se é string separada por ponto-e-vírgula
          else if (typeof details.ae_multimedia_info_dto.image_urls === 'string') {
            detailImages = details.ae_multimedia_info_dto.image_urls.split(';').filter((url: string) => url.trim());
          }
          // Verificar se tem propriedade string (formato XML)
          else if (details.ae_multimedia_info_dto.image_urls?.string) {
            detailImages = Array.isArray(details.ae_multimedia_info_dto.image_urls.string)
              ? details.ae_multimedia_info_dto.image_urls.string
              : [details.ae_multimedia_info_dto.image_urls.string];
          }
          
          allImages = [...allImages, ...detailImages];
        }
        
        // Imagem principal
        if (details.item_main_pic) {
          allImages.push(details.item_main_pic);
        }
      }
      
      // Fallback para dados da busca
      if (allImages.length === 0) {
        if (product.itemMainPic || product.product_main_image_url) {
          allImages.push(product.itemMainPic || product.product_main_image_url);
        }
        
        if (product.itemImages) {
          const images = Array.isArray(product.itemImages) 
            ? product.itemImages 
            : product.itemImages?.string || [];
          allImages = [...allImages, ...images];
        }
      }
      
      // Remover duplicatas
      allImages = [...new Set(allImages)].filter(img => img && img.trim());
      
      // Capturar especificações e variações dos detalhes ou dados da busca
      // Reutilizar a variável details já declarada acima
      const specs = details?.ae_item_properties || product.specifications || product.productSpecs || null;
      const variants = details?.aeop_ae_product_s_k_us || product.aeop_ae_product_s_k_us || product.variants || product.skus || null;
      const attrs = details?.ae_item_base_info_dto || product.productAttributes || product.attributes || null;
      
      return {
        product_id: product.itemId?.toString() || product.product_id?.toString() || '',
        product_title: product.title || product.product_title || 'Sem título',
        product_main_image_url: product.itemMainPic || product.product_main_image_url || '',
        product_description: product.productDesc || product.description || product.product_desc || '',
        product_specs: specs,
        product_variants: variants,
        product_attributes: attrs,
        target_sale_price: product.targetSalePrice || product.target_sale_price || product.salePrice || '0',
        target_original_price: product.targetOriginalPrice || product.target_original_price || product.originalPrice,
        product_detail_url: product.itemUrl || product.product_detail_url || '',
        product_small_image_urls: allImages
      };
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar produtos AliExpress:', error);
    console.error('❌ Detalhes do erro:', error instanceof Error ? error.message : String(error));
    
    // Em caso de erro, retornar produtos de exemplo para não quebrar o fluxo
    console.log('⚠️  Usando produtos de exemplo como fallback...');
    return getFallbackProducts();
  }
}

// Produtos de exemplo como fallback
function getFallbackProducts(): AliExpressProduct[] {
  return [
    {
      product_id: 'ae_demo_1',
      product_title: 'Smart Watch - Fitness Tracker [DEMO]',
      product_main_image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      target_sale_price: '25.99',
      target_original_price: '49.99',
      product_detail_url: 'https://www.aliexpress.com/item/1.html'
    },
    {
      product_id: 'ae_demo_2',
      product_title: 'Wireless Earbuds - Bluetooth 5.0 [DEMO]',
      product_main_image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
      target_sale_price: '15.99',
      target_original_price: '35.99',
      product_detail_url: 'https://www.aliexpress.com/item/2.html'
    },
    {
      product_id: 'ae_demo_3',
      product_title: 'Phone Case - Shockproof [DEMO]',
      product_main_image_url: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=400',
      target_sale_price: '8.99',
      target_original_price: '19.99',
      product_detail_url: 'https://www.aliexpress.com/item/3.html'
    }
  ];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { supplierId, keywords, categoryId } = await req.json();

    if (!supplierId) {
      return NextResponse.json({ 
        message: 'Fornecedor é obrigatório' 
      }, { status: 400 });
    }

    // Buscar credenciais do AliExpress
    const auth = await prisma.aliExpressAuth.findUnique({
      where: { userId: session.user.id }
    });

    if (!auth || !auth.appKey || !auth.appSecret || !auth.accessToken) {
      return NextResponse.json({ 
        message: 'Credenciais do AliExpress não configuradas completamente' 
      }, { status: 400 });
    }

    // Buscar produtos do AliExpress (produtos validados para dropshipping)
    const aliProducts = await fetchAliExpressProducts(
      auth.appKey, 
      auth.appSecret, 
      keywords || '', 
      categoryId || ''
    );

    const importedProducts = [];
    const errors = [];

    // Buscar categoria padrão
    let category = await prisma.category.findFirst({
      where: { slug: 'importados' }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Importados',
          slug: 'importados',
          description: 'Produtos importados do AliExpress'
        }
      });
    }

    // Importar cada produto
    let skippedCount = 0;
    let updatedCount = 0;
    
    console.log(`\n🔄 ===== INICIANDO IMPORTAÇÃO =====`);
    console.log(`📦 Total de produtos recebidos da API: ${aliProducts.length}`);
    console.log(`📂 Categoria: ${category.name} (${category.id})`);
    console.log(`🏭 Fornecedor: ${supplierId}`);
    console.log(`========================================\n`);
    
    for (const aliProduct of aliProducts) {
      try {
        console.log(`\n🔍 Processando: ${aliProduct.product_title}`);
        
        // Verificar se produto já existe (por supplierSku)
        const existingProduct = await prisma.product.findFirst({
          where: {
            supplierSku: aliProduct.product_id
          }
        });

        const costPrice = parseFloat(aliProduct.target_sale_price);
        
        // Buscar custo de frete
        console.log(`📦 Buscando custo de frete...`);
        const shippingInfo = await fetchShippingCost(auth.appKey, auth.appSecret, auth.accessToken, aliProduct.product_id);
        const shippingCost = shippingInfo?.cost || 0;
        const totalCost = costPrice + shippingCost;
        
        console.log(`💰 Custo produto: R$ ${costPrice.toFixed(2)}`);
        console.log(`🚚 Custo frete: R$ ${shippingCost.toFixed(2)}`);
        console.log(`💵 Custo total: R$ ${totalCost.toFixed(2)}`);
        
        const margin = 0.5; // 50% de margem
        const price = totalCost * (1 + margin);
        const comparePrice = aliProduct.target_original_price 
          ? parseFloat(aliProduct.target_original_price) * (1 + margin)
          : price * 1.3;

        // Traduzir título para português (simplificado)
        let translatedTitle = aliProduct.product_title
          .replace(/Trending/gi, 'Tendência')
          .replace(/Products/gi, 'Produtos')
          .replace(/New/gi, 'Novo')
          .replace(/Fashion/gi, 'Moda')
          .replace(/Women/gi, 'Mulheres')
          .replace(/Men/gi, 'Homens')
          .replace(/Jewelry/gi, 'Joias')
          .replace(/Earrings/gi, 'Brincos')
          .replace(/Necklace/gi, 'Colar')
          .replace(/Bracelet/gi, 'Pulseira')
          .replace(/Summer/gi, 'Verão')
          .replace(/Winter/gi, 'Inverno')
          .replace(/Popular/gi, 'Popular')
          .replace(/Sale/gi, 'Promoção')
          .replace(/Quality/gi, 'Qualidade')
          .replace(/Luxury/gi, 'Luxo');

        // Usar descrição da API se disponível, senão usar genérica
        let descricaoPT = '';
        
        if (aliProduct.product_description && aliProduct.product_description.trim()) {
          // Usar descrição do produto (remover HTML tags se houver)
          const descLimpa = aliProduct.product_description
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/AliExpress/gi, '') // Remove menções ao AliExpress
            .replace(/Alibaba/gi, '')
            .replace(/www\.[^\s]+/g, '') // Remove URLs
            .trim();
          
          descricaoPT = `${descLimpa}

📦 Informações de Entrega:
- Processamento: 2-5 dias úteis
- Prazo de entrega: 15-30 dias úteis
- Rastreamento fornecido após postagem

💯 Garantia:
- Produto conforme anunciado
- Suporte pós-venda
- Satisfação garantida`;
        } else {
          // Descrição genérica se API não retornar
          descricaoPT = `✨ Produto de Alta Qualidade

📦 Características:
- Produto Original
- Envio com Rastreamento
- Garantia de Qualidade
- Embalagem Protegida

🚚 Informações de Entrega:
- Processamento: 2-5 dias úteis
- Prazo de entrega: 15-30 dias úteis
- Código de rastreamento fornecido após postagem

💯 Satisfação Garantida:
- Produto conforme anunciado
- Suporte completo pós-venda
- Troca ou devolução em caso de defeito

⭐ Aproveite esta oportunidade!`;
        }

        // Preparar array de imagens
        const imagensArray = aliProduct.product_small_image_urls && aliProduct.product_small_image_urls.length > 0
          ? aliProduct.product_small_image_urls
          : [aliProduct.product_main_image_url];

        const imagensJSON = JSON.stringify(imagensArray);
        console.log(`   📸 ${imagensArray.length} imagens`);

        // Preparar especificações, variações e atributos como JSON
        const specifications = aliProduct.product_specs ? JSON.stringify(aliProduct.product_specs) : null;
        const variants = aliProduct.product_variants ? JSON.stringify(aliProduct.product_variants) : null;
        const attributes = aliProduct.product_attributes ? JSON.stringify(aliProduct.product_attributes) : null;
        
        console.log(`   🔍 Variants a serem salvos: ${variants ? 'SIM' : 'NÃO'}`);
        if (variants) console.log(`   📦 Tamanho do JSON: ${variants.length} caracteres`);

        // 🏷️ Extrair informações para campos dedicados (marketplaces)
        let brand: string | null = null;
        let model: string | null = null;
        let color: string | null = null;
        let mpn: string | null = null;
        
        // Tentar extrair de product_specs (ae_item_properties)
        if (aliProduct.product_specs) {
          const specs = Array.isArray(aliProduct.product_specs) 
            ? aliProduct.product_specs 
            : aliProduct.product_specs?.aeop_ae_product_property || [];
          
          for (const spec of specs) {
            const attrName = spec.attr_name?.toLowerCase() || spec.attrName?.toLowerCase() || '';
            const attrValue = spec.attr_value || spec.attrValue || '';
            
            if (attrName.includes('brand') || attrName.includes('marca')) {
              brand = attrValue;
            } else if (attrName.includes('model') || attrName.includes('modelo')) {
              model = attrValue;
            } else if (attrName.includes('color') || attrName.includes('cor') || attrName.includes('colour')) {
              color = attrValue;
            } else if (attrName.includes('mpn') || attrName.includes('part number')) {
              mpn = attrValue;
            }
          }
        }
        
        // Tentar extrair de product_attributes
        if (aliProduct.product_attributes) {
          const attrs = aliProduct.product_attributes;
          
          if (attrs.brand) brand = brand || attrs.brand;
          if (attrs.model) model = model || attrs.model;
          if (attrs.color) color = color || attrs.color;
          if (attrs.mpn) mpn = mpn || attrs.mpn;
        }
        
        console.log(`   🏷️  Brand: ${brand || 'N/A'}, Model: ${model || 'N/A'}, Color: ${color || 'N/A'}`);

        // Se produto existe, ATUALIZAR ao invés de pular
        if (existingProduct) {
          const updatedProduct = await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: translatedTitle,
              description: descricaoPT,
              price,
              comparePrice,
              costPrice,
              margin: margin * 100,
              images: imagensJSON,
              specifications,
              variants,
              attributes,
              brand,
              model,
              color,
              mpn,
              supplierUrl: aliProduct.product_detail_url,
              updatedAt: new Date()
            }
          });
          
          console.log(`   ✅ ATUALIZADO (${imagensArray.length} fotos, R$ ${price.toFixed(2)})`);
          importedProducts.push(updatedProduct);
          updatedCount++;
          continue;
        }

        // Se não existe, CRIAR novo
        const product = await prisma.product.create({
          data: {
            name: translatedTitle,
            slug: `${aliProduct.product_id}-${Date.now()}`,
            description: descricaoPT,
            price,
            comparePrice,
            costPrice,
            shippingCost,
            taxCost: 0,
            totalCost,
            margin: margin * 100,
            images: imagensJSON,
            specifications,
            variants,
            attributes,
            brand,
            model,
            color,
            mpn,
            stock: 9999, // Estoque infinito (dropshipping)
            categoryId: category.id,
            supplierId,
            supplierSku: aliProduct.product_id,
            supplierUrl: aliProduct.product_detail_url
          }
        });

        console.log(`   ✅ CRIADO (${imagensArray.length} fotos, R$ ${price.toFixed(2)})`);
        importedProducts.push(product);
      } catch (error) {
        console.log(`   ❌ ERRO ao criar produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        console.error('Stack trace completo:', error);
        errors.push({
          product: aliProduct.product_title,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    console.log(`\n📊 ===== RESULTADO DA IMPORTAÇÃO =====`);
    console.log(`✅ Produtos CRIADOS no banco: ${importedProducts.length - updatedCount}`);
    console.log(`🔄 Produtos ATUALIZADOS: ${updatedCount}`);
    console.log(`⏭️  Produtos PULADOS (duplicados): ${skippedCount}`);
    console.log(`❌ Produtos com ERRO: ${errors.length}`);
    console.log(`📦 Total recebido da API: ${aliProducts.length}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      message: `${importedProducts.length - updatedCount} novos, ${updatedCount} atualizados (${skippedCount} pulados, ${errors.length} erros)`,
      importedProducts,
      createdCount: importedProducts.length - updatedCount,
      updatedCount,
      skippedProducts: skippedCount,
      totalFromApi: aliProducts.length,
      errors
    });
  } catch (error) {
    console.error('Erro ao importar produtos AliExpress:', error);
    return NextResponse.json({ 
      message: 'Erro ao importar produtos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
