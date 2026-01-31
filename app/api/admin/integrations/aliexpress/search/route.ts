import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Gerar assinatura AliExpress HMAC-SHA256
function generateSign(appSecret: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort();
  
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
  
  const signature = crypto.createHmac('sha256', appSecret)
    .update(signString)
    .digest('hex')
    .toUpperCase();
  
  return signature;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { keywords, limit = 100, exactMatch = false } = await request.json();

    if (!keywords) {
      return NextResponse.json({ error: 'Keywords são obrigatórias' }, { status: 400 });
    }

    // Usar keywords completas (removemos o exactMatch que cortava a busca)
    const searchKeywords = keywords.trim();

    // Buscar configuração do AliExpress
    const auth = await prisma.aliExpressAuth.findFirst();

    if (!auth) {
      return NextResponse.json({ error: 'AliExpress não configurado' }, { status: 400 });
    }

    const { appKey, appSecret, accessToken } = auth;

    if (!appKey || !appSecret || !accessToken) {
      return NextResponse.json({ error: 'Credenciais AliExpress incompletas' }, { status: 400 });
    }

    // API DS: aliexpress.ds.text.search
    const apiUrl = 'https://api-sg.aliexpress.com/sync';
    const timestamp = Date.now().toString();

    const params: Record<string, any> = {
      app_key: appKey,
      method: 'aliexpress.ds.text.search',
      session: accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      keywords: searchKeywords,
      countryCode: 'BR',
      currency: 'BRL',
      language: 'en', // Inglês para busca mais precisa
      local: 'en_US',
      page_no: '1',
      page_size: String(Math.min(limit, 100)),
      sort: 'LAST_VOLUME_DESC',
      // Parâmetros adicionais para busca mais precisa
      search_type: 'product' // Buscar produtos, não recomendações
    };

    console.log(`🔍 [DS API] Buscando: "${searchKeywords}" (limit: ${limit})`);

    const sign = generateSign(appSecret, params);
    params['sign'] = sign;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    });

    const data = await response.json();
    
    // Log para debug da estrutura
    console.log('📥 [DS API] Resposta:', JSON.stringify(data, null, 2).substring(0, 2000));

    // Verificar erro
    if (data.error_response) {
      console.error('❌ Erro AliExpress:', data.error_response);
      return NextResponse.json({ 
        products: [],
        error: data.error_response.msg || 'Erro na API AliExpress'
      });
    }

    // Extrair produtos da resposta DS - tentar diferentes formatos
    let rawProducts: any[] = [];
    let totalResults = 0;
    
    const responseData = data.aliexpress_ds_text_search_response?.data;
    
    if (responseData?.products) {
      // Formato correto: products.selection_search_product
      if (responseData.products.selection_search_product) {
        rawProducts = responseData.products.selection_search_product;
      } else if (Array.isArray(responseData.products)) {
        rawProducts = responseData.products;
      } else if (responseData.products.product) {
        rawProducts = responseData.products.product;
      }
      totalResults = responseData.totalCount || rawProducts.length;
    }
    
    // Garantir que rawProducts é um array
    if (!Array.isArray(rawProducts)) {
      rawProducts = rawProducts ? [rawProducts] : [];
    }

    // FILTRAR produtos que NÃO correspondem à busca (type="recommend" sem relação)
    const searchTerms = keywords.toLowerCase().split(' ').filter((t: string) => t.length > 2);
    
    const filteredProducts = rawProducts.filter((p: any) => {
      const title = (p.title || '').toLowerCase();
      // Produto deve conter pelo menos uma palavra-chave no título
      return searchTerms.some((term: string) => title.includes(term));
    });

    console.log(`✅ [DS API] ${rawProducts.length} brutos → ${filteredProducts.length} filtrados para: "${keywords}"`);

    const products = filteredProducts.map((p: any) => ({
      productId: p.itemId?.toString() || p.product_id?.toString() || '',
      title: p.title || p.product_title || '',
      price: parseFloat(p.targetSalePrice) || parseFloat(p.target_sale_price) || parseFloat(p.salePrice) || 0,
      originalPrice: parseFloat(p.targetOriginalPrice) || parseFloat(p.target_original_price) || parseFloat(p.originalPrice) || 0,
      imageUrl: p.itemMainPic ? `https:${p.itemMainPic}` : (p.product_main_image_url || p.image_url || ''),
      rating: p.score ? parseFloat(p.score) : (p.evaluate_rate ? parseFloat(p.evaluate_rate) / 20 : null),
      orders: p.orders ? parseInt(p.orders.toString().replace(/[^\d]/g, '')) : 0
    }));

    return NextResponse.json({ 
      products,
      total: totalResults
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro ao buscar produtos',
      products: []
    }, { status: 500 });
  }
}
