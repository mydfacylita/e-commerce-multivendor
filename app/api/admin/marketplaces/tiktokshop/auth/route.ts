import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Verificar status da autenticação
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tiktokShopAuth: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!user.tiktokShopAuth) {
      return NextResponse.json({ isConnected: false });
    }

    const isExpired = user.tiktokShopAuth.expiresAt 
      ? new Date(user.tiktokShopAuth.expiresAt) < new Date() 
      : true;

    const isConnected = !!user.tiktokShopAuth.accessToken && !isExpired;

    return NextResponse.json({
      isConnected,
      shopId: user.tiktokShopAuth.shopId,
      shopName: user.tiktokShopAuth.shopName,
      sellerName: user.tiktokShopAuth.sellerName,
      region: user.tiktokShopAuth.region,
      expiresAt: user.tiktokShopAuth.expiresAt,
      appKey: user.tiktokShopAuth.appKey ? user.tiktokShopAuth.appKey.substring(0, 8) + '****' : null,
    });
  } catch (error) {
    console.error('Erro ao verificar status TikTok Shop:', error);
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 });
  }
}

// POST - Salvar credenciais (App Key e App Secret)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { appKey, appSecret } = await request.json();

    if (!appKey || !appSecret) {
      return NextResponse.json(
        { error: 'App Key e App Secret são obrigatórios' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Upsert - atualiza se existe, cria se não existe
    await prisma.tikTokShopAuth.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        appKey,
        appSecret,
        region: 'BR',
      },
      update: {
        appKey,
        appSecret,
        // Limpa tokens antigos ao atualizar credenciais
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        shopId: null,
        shopName: null,
        sellerName: null,
        shopCipher: null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Credenciais salvas com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao salvar credenciais TikTok Shop:', error);
    return NextResponse.json({ error: 'Erro ao salvar credenciais' }, { status: 500 });
  }
}

// DELETE - Remover autenticação
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

    await prisma.tikTokShopAuth.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Conta TikTok Shop desconectada' 
    });
  } catch (error) {
    console.error('Erro ao desconectar TikTok Shop:', error);
    return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 });
  }
}
