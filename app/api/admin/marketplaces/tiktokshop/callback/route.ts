import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAccessToken, getAuthorizedShops } from '@/lib/tiktokshop';

// GET - Callback do OAuth após autorização do usuário
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Validar parâmetros
    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/integracao/tiktokshop?error=missing_code', request.url)
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.redirect(
        new URL('/login?redirect=/admin/integracao/tiktokshop', request.url)
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tiktokShopAuth: true },
    });

    if (!user || !user.tiktokShopAuth) {
      return NextResponse.redirect(
        new URL('/admin/integracao/tiktokshop?error=not_configured', request.url)
      );
    }

    // Validar state para proteção CSRF (se disponível)
    if (state && user.tiktokShopAuth.openId !== state) {
      console.warn('State mismatch - possível CSRF');
      // Continuar mesmo assim para não bloquear usuários legítimos
    }

    // Trocar código por access token
    const tokenResult = await getAccessToken(
      user.tiktokShopAuth.appKey,
      user.tiktokShopAuth.appSecret,
      code
    );

    if (tokenResult.code !== 0) {
      console.error('Erro ao obter access token:', tokenResult);
      return NextResponse.redirect(
        new URL(`/admin/integracao/tiktokshop?error=${encodeURIComponent(tokenResult.message)}`, request.url)
      );
    }

    const tokenData = tokenResult.data;

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.access_token_expire_in || 86400));

    // Salvar tokens
    await prisma.tikTokShopAuth.update({
      where: { userId: user.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accessTokenExpireIn: tokenData.access_token_expire_in,
        refreshTokenExpireIn: tokenData.refresh_token_expire_in,
        openId: tokenData.open_id,
        sellerName: tokenData.seller_name,
        expiresAt,
      },
    });

    // Buscar informações da loja autorizada
    try {
      const shopsResult = await getAuthorizedShops({
        appKey: user.tiktokShopAuth.appKey,
        appSecret: user.tiktokShopAuth.appSecret,
        accessToken: tokenData.access_token,
      });

      if (shopsResult.code === 0 && shopsResult.data?.shops?.length > 0) {
        const shop = shopsResult.data.shops[0]; // Usar a primeira loja
        
        await prisma.tikTokShopAuth.update({
          where: { userId: user.id },
          data: {
            shopId: shop.id,
            shopName: shop.name,
            shopCipher: shop.cipher,
            region: shop.region,
          },
        });
      }
    } catch (shopError) {
      console.error('Erro ao buscar lojas:', shopError);
      // Não bloquear o fluxo, apenas logar o erro
    }

    return NextResponse.redirect(
      new URL('/admin/integracao/tiktokshop?success=connected', request.url)
    );
  } catch (error) {
    console.error('Erro no callback TikTok Shop:', error);
    return NextResponse.redirect(
      new URL('/admin/integracao/tiktokshop?error=internal_error', request.url)
    );
  }
}
