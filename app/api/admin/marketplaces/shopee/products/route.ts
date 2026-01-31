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
  accessToken: string,
  shopId: number,
  body: any = {}
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const url = `${SHOPEE_API_BASE_URL}${endpoint}`;
  
  const requestBody = JSON.stringify({
    partner_id: partnerId,
    timestamp,
    access_token: accessToken,
    shop_id: shopId,
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

// Função para renovar access token se necessário
async function refreshAccessTokenIfNeeded(userId: string) {
  const shopeeAuth = await prisma.shopeeAuth.findUnique({
    where: { userId },
  });

  if (!shopeeAuth) {
    throw new Error('Autenticação Shopee não encontrada');
  }

  // Se o token expira em menos de 30 minutos, renovar
  const expiresIn = shopeeAuth.expiresAt.getTime() - Date.now();
  if (expiresIn < 30 * 60 * 1000) {
    const endpoint = '/api/v2/auth/access_token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `${SHOPEE_API_BASE_URL}${endpoint}`;
    
    const requestBody = JSON.stringify({
      refresh_token: shopeeAuth.refreshToken,
      partner_id: shopeeAuth.partnerId,
      shop_id: shopeeAuth.shopId,
    });

    const baseString = `${shopeeAuth.partnerId}${endpoint}${timestamp}${requestBody}`;
    const sign = crypto.createHmac('sha256', shopeeAuth.partnerKey).update(baseString).digest('hex');

    const fullUrl = `${url}?partner_id=${shopeeAuth.partnerId}&timestamp=${timestamp}&sign=${sign}`;

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    const data = await response.json();

    if (data.access_token && data.refresh_token) {
      const expiresAt = new Date(Date.now() + data.expire_in * 1000);
      
      await prisma.shopeeAuth.update({
        where: { userId },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
        },
      });

      return data.access_token;
    }
  }

  return shopeeAuth.accessToken;
}

// GET - Listar produtos da loja Shopee
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

    if (!user?.shopeeAuth) {
      return NextResponse.json({ error: 'Shopee não conectada' }, { status: 400 });
    }

    const accessToken = await refreshAccessTokenIfNeeded(user.id);
    const { partnerId, partnerKey, shopId } = user.shopeeAuth;

    // Buscar lista de produtos
    const data = await shopeeRequest(
      '/api/v2/product/get_item_list',
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        offset: 0,
        page_size: 50,
        item_status: ['NORMAL'], // Produtos ativos
      }
    );

    if (data.error) {
      return NextResponse.json({ error: data.message || 'Erro ao buscar produtos' }, { status: 400 });
    }

    const itemIds = data.response?.item?.map((item: any) => item.item_id) || [];

    if (itemIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Buscar detalhes dos produtos
    const detailsData = await shopeeRequest(
      '/api/v2/product/get_item_base_info',
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        item_id_list: itemIds,
      }
    );

    const products = detailsData.response?.item_list || [];

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Erro ao listar produtos Shopee:', error);
    return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 });
  }
}

// POST - Criar produto na Shopee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID é obrigatório' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    });

    if (!user?.shopeeAuth) {
      return NextResponse.json({ error: 'Shopee não conectada' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const accessToken = await refreshAccessTokenIfNeeded(user.id);
    const { partnerId, partnerKey, shopId } = user.shopeeAuth;

    // Preparar imagens
    const images = JSON.parse(product.images || '[]');
    const imageUrls = images.slice(0, 9); // Shopee permite até 9 imagens

    // Criar produto na Shopee
    const data = await shopeeRequest(
      '/api/v2/product/add_item',
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        original_price: product.price,
        description: product.description || product.name,
        weight: 0.5, // Peso padrão em kg
        item_name: product.name.substring(0, 120), // Limite de 120 caracteres
        item_status: 'NORMAL',
        dimension: {
          package_length: 20,
          package_width: 15,
          package_height: 10,
        },
        normal_stock: product.stock,
        logistic_info: [
          {
            logistic_id: 0, // ID do método de entrega (precisa ser configurado)
            enabled: true,
          },
        ],
        image: {
          image_url_list: imageUrls,
        },
        brand: {
          brand_id: 0,
          original_brand_name: product.brand || '',
        },
        category_id: 0, // ID da categoria na Shopee (precisa mapear)
      }
    );

    if (data.error) {
      return NextResponse.json(
        { error: data.message || 'Erro ao criar produto' },
        { status: 400 }
      );
    }

    const itemId = data.response?.item_id;

    // Salvar mapeamento no banco
    if (itemId) {
      await prisma.marketplaceListing.create({
        data: {
          productId: product.id,
          marketplace: 'SHOPEE',
          listingId: itemId.toString(),
          status: 'active',
          title: product.name,
          price: product.price,
          stock: product.stock,
          syncEnabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      itemId,
      message: 'Produto criado com sucesso na Shopee',
    });
  } catch (error) {
    console.error('Erro ao criar produto na Shopee:', error);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}

// PUT - Atualizar estoque na Shopee
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, stock } = body;

    if (!productId || stock === undefined) {
      return NextResponse.json({ error: 'Product ID e stock são obrigatórios' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    });

    if (!user?.shopeeAuth) {
      return NextResponse.json({ error: 'Shopee não conectada' }, { status: 400 });
    }

    const listing = await prisma.marketplaceListing.findFirst({
      where: {
        productId,
        marketplace: 'SHOPEE',
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Produto não encontrado na Shopee' }, { status: 404 });
    }

    const accessToken = await refreshAccessTokenIfNeeded(user.id);
    const { partnerId, partnerKey, shopId } = user.shopeeAuth;

    // Atualizar estoque na Shopee
    const data = await shopeeRequest(
      '/api/v2/product/update_stock',
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        item_id: parseInt(listing.listingId),
        stock_list: [
          {
            model_id: 0, // ID da variação (0 para produto sem variação)
            normal_stock: stock,
          },
        ],
      }
    );

    if (data.error) {
      return NextResponse.json({ error: data.message || 'Erro ao atualizar estoque' }, { status: 400 });
    }

    // Atualizar no banco
    await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { stock },
    });

    return NextResponse.json({ success: true, message: 'Estoque atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar estoque Shopee:', error);
    return NextResponse.json({ error: 'Erro ao atualizar estoque' }, { status: 500 });
  }
}
