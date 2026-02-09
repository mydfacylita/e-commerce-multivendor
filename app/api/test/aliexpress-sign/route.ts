import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  // 🚫 BLOQUEAR EM PRODUÇÃO
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 🔐 Verificar autenticação admin
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json();
    const { appKey, appSecret, code, timestamp, uuid, signMethod } = body;

    // Construir parâmetros
    const params: Record<string, string> = {
      app_key: appKey,
      code: code,
      timestamp: timestamp,
      sign_method: signMethod,
      uuid: uuid
    };

    // Ordenar alfabeticamente
    const sortedKeys = Object.keys(params).sort();
    
    // Construir sign string: appSecret + key1value1key2value2 + appSecret
    const signString = appSecret + sortedKeys.map(key => `${key}${params[key]}`).join('') + appSecret;

    // Calcular hash
    const hash = crypto.createHash(signMethod)
      .update(signString)
      .digest('hex')
      .toUpperCase();

    // Construir URL
    const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    const url = `https://api-sg.aliexpress.com/rest/auth/token/create?${paramString}&sign=${hash}`;

    return NextResponse.json({
      params,
      signString,
      signature: hash,
      url
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // 🚫 BLOQUEAR EM PRODUÇÃO
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 🔐 Verificar autenticação admin
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url);
    // 🚨 NUNCA expor secrets - devem ser passados como parâmetro
    const appKey = searchParams.get('app_key');
    const appSecret = searchParams.get('app_secret');
    
    if (!appKey || !appSecret) {
      return NextResponse.json({ error: 'app_key e app_secret são obrigatórios' }, { status: 400 });
    }
    const code = searchParams.get('code') || '';
    const timestamp = searchParams.get('timestamp') || Date.now().toString();
    const uuid = searchParams.get('uuid') || 'uuid';
    const signMethod = searchParams.get('sign_method') || 'sha256';

    if (!code) {
      return NextResponse.json({ error: 'Code é obrigatório' }, { status: 400 });
    }

    // Construir parâmetros
    const params: Record<string, string> = {
      app_key: appKey,
      code: code,
      timestamp: timestamp,
      sign_method: signMethod,
      uuid: uuid
    };

    // Ordenar alfabeticamente
    const sortedKeys = Object.keys(params).sort();
    
    // Construir sign string: appSecret + key1value1key2value2 + appSecret
    const signString = appSecret + sortedKeys.map(key => `${key}${params[key]}`).join('') + appSecret;

    // Calcular hash
    const hash = crypto.createHash(signMethod)
      .update(signString)
      .digest('hex')
      .toUpperCase();

    // Fazer request para AliExpress
    const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    const url = `https://api-sg.aliexpress.com/rest/auth/token/create?${paramString}&sign=${hash}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    return NextResponse.json({
      request: {
        params,
        signString,
        signature: hash,
        url
      },
      response: {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: data
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
