import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  // 🚫 BLOQUEAR EM PRODUÇÃO
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 🔐 Verificar autenticação admin
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url);
    // 🚨 NUNCA usar defaults com secrets - devem ser passados
    const appKey = searchParams.get('app_key');
    const appSecret = searchParams.get('app_secret');
    
    if (!appKey || !appSecret) {
      return NextResponse.json({ error: 'app_key e app_secret são obrigatórios' }, { status: 400 });
    }
    const code = searchParams.get('code') || '';
    const timestamp = searchParams.get('timestamp') || Date.now().toString();
    const uuid = searchParams.get('uuid') || 'uuid';
    const signMethod = (searchParams.get('sign_method') || 'sha256') as 'sha256' | 'md5';

    if (!code) {
      return NextResponse.json({ error: 'Code é obrigatório' }, { status: 400 });
    }

    // Parâmetros que VÃO na URL
    const urlParams: Record<string, string> = {
      app_key: appKey,
      code: code,
      timestamp: timestamp,
      sign_method: signMethod,
      uuid: uuid
    };

    // Testar DIFERENTES combinações para calcular a assinatura
    const signatureTests = [];

    // Teste 1: Todos os parâmetros (incluindo sign_method e uuid)
    {
      const signParams = ['app_key', 'code', 'sign_method', 'timestamp', 'uuid'];
      const signString = appSecret + signParams.map(k => `${k}${urlParams[k]}`).join('') + appSecret;
      const hash = crypto.createHash(signMethod).update(signString).digest('hex').toUpperCase();
      signatureTests.push({
        name: '✅ Completo (com sign_method e uuid)',
        signString,
        signature: hash,
        params: signParams
      });
    }

    // Teste 2: Sem sign_method
    {
      const signParams = ['app_key', 'code', 'timestamp', 'uuid'];
      const signString = appSecret + signParams.map(k => `${k}${urlParams[k]}`).join('') + appSecret;
      const hash = crypto.createHash(signMethod).update(signString).digest('hex').toUpperCase();
      signatureTests.push({
        name: '⚠️ Sem sign_method',
        signString,
        signature: hash,
        params: signParams
      });
    }

    // Teste 3: Sem uuid
    {
      const signParams = ['app_key', 'code', 'sign_method', 'timestamp'];
      const signString = appSecret + signParams.map(k => `${k}${urlParams[k]}`).join('') + appSecret;
      const hash = crypto.createHash(signMethod).update(signString).digest('hex').toUpperCase();
      signatureTests.push({
        name: '⚠️ Sem uuid',
        signString,
        signature: hash,
        params: signParams
      });
    }

    // Teste 4: Apenas essenciais (app_key, code, timestamp)
    {
      const signParams = ['app_key', 'code', 'timestamp'];
      const signString = appSecret + signParams.map(k => `${k}${urlParams[k]}`).join('') + appSecret;
      const hash = crypto.createHash(signMethod).update(signString).digest('hex').toUpperCase();
      signatureTests.push({
        name: '🔑 Apenas essenciais (app_key, code, timestamp)',
        signString,
        signature: hash,
        params: signParams
      });
    }

    // Teste 5: Sem sign_method e sem uuid
    {
      const signParams = ['app_key', 'code', 'timestamp'];
      const signString = appSecret + signParams.map(k => `${k}${urlParams[k]}`).join('') + appSecret;
      const hash = crypto.createHash(signMethod).update(signString).digest('hex').toUpperCase();
      signatureTests.push({
        name: '💡 Mínimo (app_key, code, timestamp)',
        signString,
        signature: hash,
        params: signParams
      });
    }

    // Usar a primeira opção (completa) como padrão para fazer o request
    const defaultSignature = signatureTests[0];
    const paramString = Object.keys(urlParams).sort().map(k => `${k}=${urlParams[k]}`).join('&');
    const testUrl = `https://api-sg.aliexpress.com/rest/auth/token/create?${paramString}&sign=${defaultSignature.signature}`;

    // Fazer request real com a assinatura padrão
    let apiResponse = null;
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      apiResponse = {
        status: response.status,
        body: data
      };
    } catch (error: any) {
      apiResponse = { error: error.message };
    }

    return NextResponse.json({
      urlParams,
      signatureTests,
      defaultTest: {
        name: defaultSignature.name,
        signature: defaultSignature.signature,
        url: testUrl
      },
      apiResponse
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
