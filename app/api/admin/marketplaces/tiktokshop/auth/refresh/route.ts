import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/tiktokshop';

// POST - Renovar access token usando refresh token
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Conta TikTok Shop não configurada' },
        { status: 400 }
      );
    }

    if (!user.tiktokShopAuth.refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token não disponível. Reconecte sua conta.' },
        { status: 400 }
      );
    }

    // Chamar API para renovar token
    const result = await refreshAccessToken(
      user.tiktokShopAuth.appKey,
      user.tiktokShopAuth.appSecret,
      user.tiktokShopAuth.refreshToken
    );

    if (result.code !== 0) {
      console.error('Erro TikTok Shop refresh token:', result);
      return NextResponse.json(
        { error: result.message || 'Erro ao renovar token' },
        { status: 400 }
      );
    }

    const tokenData = result.data;

    // Calcular nova data de expiração
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.access_token_expire_in || 0));

    // Atualizar tokens no banco
    await prisma.tikTokShopAuth.update({
      where: { userId: user.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accessTokenExpireIn: tokenData.access_token_expire_in,
        refreshTokenExpireIn: tokenData.refresh_token_expire_in,
        expiresAt,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Token renovado com sucesso',
      expiresAt 
    });
  } catch (error) {
    console.error('Erro ao renovar token TikTok Shop:', error);
    return NextResponse.json({ error: 'Erro ao renovar token' }, { status: 500 });
  }
}
