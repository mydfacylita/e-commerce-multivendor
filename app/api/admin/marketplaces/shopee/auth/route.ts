import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const SHOPEE_API_BASE_URL = 'https://partner.shopeemobile.com';

// Função para gerar assinatura HMAC-SHA256 da Shopee
function generateShopeeSignature(url: string, body: string, partnerId: number, partnerKey: string, timestamp: number): string {
  const path = new URL(url).pathname;
  const baseString = `${partnerId}${path}${timestamp}${body}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Função para fazer requisição à API da Shopee
async function shopeeRequest(
  endpoint: string,
  partnerId: number,
  partnerKey: string,
  accessToken?: string,
  shopId?: number,
  body: any = {}
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const url = `${SHOPEE_API_BASE_URL}${endpoint}`;
  
  const requestBody = JSON.stringify({
    partner_id: partnerId,
    timestamp,
    access_token: accessToken || '',
    shop_id: shopId || 0,
    ...body,
  });

  const sign = generateShopeeSignature(url, requestBody, partnerId, partnerKey, timestamp);
  
  const fullUrl = `${url}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: requestBody,
  });

  return response.json();
}

// GET - Verificar status da autenticação
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!user.shopeeAuth) {
      return NextResponse.json({ isConnected: false });
    }

    const isExpired = new Date(user.shopeeAuth.expiresAt) < new Date();

    return NextResponse.json({
      isConnected: !isExpired,
      shopId: user.shopeeAuth.shopId,
      partnerId: user.shopeeAuth.partnerId,
      merchantName: user.shopeeAuth.merchantName,
      region: user.shopeeAuth.region,
      expiresAt: user.shopeeAuth.expiresAt,
    });
  } catch (error) {
    console.error('Erro ao verificar status Shopee:', error);
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 });
  }
}

// POST - Salvar credenciais (Partner ID e Partner Key)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { partnerId, partnerKey } = await request.json();

    if (!partnerId || !partnerKey) {
      return NextResponse.json(
        { error: 'Partner ID e Partner Key são obrigatórios' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Salvar/atualizar apenas as credenciais (sem tokens ainda)
    const shopeeAuth = await prisma.shopeeAuth.upsert({
      where: { userId: user.id },
      update: {
        partnerId,
        partnerKey,
      },
      create: {
        userId: user.id,
        partnerId,
        partnerKey,
        shopId: 0, // Será preenchido após autorização
        accessToken: '',
        refreshToken: '',
        expiresAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, partnerId: shopeeAuth.partnerId });
  } catch (error) {
    console.error('Erro ao salvar credenciais Shopee:', error);
    return NextResponse.json({ error: 'Erro ao salvar credenciais' }, { status: 500 });
  }
}

// DELETE - Desconectar conta Shopee
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    await prisma.shopeeAuth.delete({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao desconectar Shopee:', error);
    return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 });
  }
}
