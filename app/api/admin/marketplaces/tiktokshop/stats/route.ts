import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProducts, getOrders } from '@/lib/tiktokshop';

// GET - Buscar estatísticas da loja TikTok Shop
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

    if (!user.tiktokShopAuth?.accessToken || !user.tiktokShopAuth?.shopCipher) {
      return NextResponse.json({ 
        products: 0, 
        orders: 0 
      });
    }

    const config = {
      appKey: user.tiktokShopAuth.appKey,
      appSecret: user.tiktokShopAuth.appSecret,
      accessToken: user.tiktokShopAuth.accessToken,
    };

    let productCount = 0;
    let orderCount = 0;

    // Buscar contagem de produtos
    try {
      const productsResult = await getProducts(config, user.tiktokShopAuth.shopCipher, 1);
      if (productsResult.code === 0 && productsResult.data) {
        productCount = productsResult.data.total_count || 0;
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }

    // Buscar contagem de pedidos do mês atual
    try {
      const ordersResult = await getOrders(config, user.tiktokShopAuth.shopCipher, 1);
      if (ordersResult.code === 0 && ordersResult.data) {
        orderCount = ordersResult.data.total_count || 0;
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    }

    return NextResponse.json({ 
      products: productCount, 
      orders: orderCount 
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas TikTok Shop:', error);
    return NextResponse.json({ 
      products: 0, 
      orders: 0 
    });
  }
}
