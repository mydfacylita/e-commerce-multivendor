import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Força renderização dinâmica para evitar erro de pre-render
export const dynamic = 'force-dynamic';

// URL base para redirects - SEMPRE usa gerencial-sys para admin
const getBaseUrl = () => {
  return 'https://gerencial-sys.mydshop.com.br';
};

// Callback OAuth - recebe o código e troca por access token
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl();
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    
    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/admin/integracao/aliexpress?error=no_code`);
    }

    console.log('✅ Código OAuth recebido:', code);
    console.log('👤 UserId:', state);

    // Buscar credenciais do usuário
    const auth = await prisma.aliExpressAuth.findUnique({
      where: { userId: state }
    });

    if (!auth) {
      return NextResponse.redirect(`${baseUrl}/admin/integracao/aliexpress?error=no_config`);
    }

    // Trocar código por access token - Endpoint oficial /rest/auth/token/create
    const timestamp = Date.now().toString(); // Timestamp em milissegundos
    
    const params: Record<string, string> = {
      app_key: auth.appKey,
      code: code,
      timestamp: timestamp,
      sign_method: 'sha256'
      // uuid removido - não aparece no exemplo da documentação
    };
    
    // Ordenar parâmetros alfabeticamente
    const sortedKeys = Object.keys(params).sort();
    
    // Construir string de parâmetros: key1=value1&key2=value2
    let paramString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    
    // System API: /api_path + key1value1key2value2
    const apiPath = '/auth/token/create';
    let signString = apiPath + sortedKeys.map(key => `${key}${params[key]}`).join('');
    
    // HMAC-SHA256 com appSecret como chave
    const sign = crypto.createHmac('sha256', auth.appSecret)
      .update(signString)
      .digest('hex')
      .toUpperCase();
    
    const tokenUrl = `https://api-sg.aliexpress.com/rest/auth/token/create?${paramString}&sign=${sign}`;

    console.log('🔄 Trocando código por access token (/rest/auth/token/create)...');
    console.log('📡 URL:', tokenUrl);
    console.log('📋 Params:', params);
    console.log('🔐 Sign String:', signString);
    console.log('🔐 Sign:', sign);

    const response = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('📥 Status:', response.status);
    console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📦 Resposta RAW:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Erro ao parsear JSON:', e);
      console.error('❌ Response Text:', responseText);
      throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 100)}`);
    }
    console.log('📦 Resposta:', JSON.stringify(data, null, 2));

    if (data.error_response) {
      console.error('❌ Erro na troca de token:', data.error_response);
      return NextResponse.redirect(`${baseUrl}/admin/integracao/aliexpress?error=token_exchange_failed`);
    }

    // Extrair tokens da resposta
    const tokenData = data.aliexpress_system_oauth_access_token_get_response || data;
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = parseInt(tokenData.expires_in || '0');
    const sellerId = tokenData.seller_id || tokenData.user_id;

    if (!accessToken) {
      console.error('❌ Access token não encontrado na resposta');
      return NextResponse.redirect(`${baseUrl}/admin/integracao/aliexpress?error=no_token`);
    }

    // Salvar tokens no banco
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    await prisma.aliExpressAuth.upsert({
      where: { userId: state },
      create: {
        userId: state,
        appKey: auth.appKey,
        appSecret: auth.appSecret,
        accessToken,
        refreshToken,
        expiresAt,
        sellerId,
      },
      update: {
        accessToken,
        refreshToken,
        expiresAt,
        sellerId,
      }
    });

    console.log('✅ Access token salvo com sucesso!');
    console.log('⏰ Expira em:', expiresAt);

    return NextResponse.redirect(`${baseUrl}/admin/integracao/aliexpress?success=authorized`);
  } catch (error) {
    console.error('❌ Erro no callback OAuth:', error);
    return NextResponse.redirect(`${baseUrl}/admin/integracao/aliexpress?error=callback_failed`);
  }
}

// Função para gerar assinatura
function generateSign(appSecret: string, apiPath: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort();
  
  let paramString = apiPath;
  sortedKeys.forEach(key => {
    paramString += key + String(params[key]);
  });
  
  const hmac = crypto.createHmac('md5', appSecret);
  hmac.update(paramString, 'utf8');
  return hmac.digest('hex').toUpperCase();
}
