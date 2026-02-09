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
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { appKey, code, timestamp, signMethod } = await req.json();

    const params: Record<string, string> = {
      app_key: appKey,
      code: code,
      timestamp: timestamp,
      sign_method: signMethod
    };

    const sortedKeys = Object.keys(params).sort();
    const apiPath = '/auth/token/create';
    const signString = apiPath + sortedKeys.map(key => `${key}${params[key]}`).join('');

    const sign = crypto.createHash('sha256')
      .update(signString, 'utf8')
      .digest('hex')
      .toUpperCase();

    const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    const finalUrl = `https://api-sg.aliexpress.com/rest/auth/token/create?${paramString}&sign=${sign}`;

    return NextResponse.json({
      signString,
      signature: sign,
      finalUrl
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
