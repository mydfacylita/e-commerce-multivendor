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

// GET - Buscar pedidos da Shopee
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

    const { partnerId, partnerKey, shopId, accessToken } = user.shopeeAuth;

    // Buscar pedidos dos últimos 15 dias
    const timeFrom = Math.floor((Date.now() - 15 * 24 * 60 * 60 * 1000) / 1000);
    const timeTo = Math.floor(Date.now() / 1000);

    const data = await shopeeRequest(
      '/api/v2/order/get_order_list',
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        time_range_field: 'create_time',
        time_from: timeFrom,
        time_to: timeTo,
        page_size: 50,
        order_status: 'READY_TO_SHIP', // Pedidos prontos para envio
      }
    );

    if (data.error) {
      return NextResponse.json({ error: data.message || 'Erro ao buscar pedidos' }, { status: 400 });
    }

    const orderSnList = data.response?.order_list?.map((order: any) => order.order_sn) || [];

    if (orderSnList.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Buscar detalhes dos pedidos
    const detailsData = await shopeeRequest(
      '/api/v2/order/get_order_detail',
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        order_sn_list: orderSnList,
        response_optional_fields: [
          'buyer_user_id',
          'buyer_username',
          'recipient_address',
          'actual_shipping_fee',
          'item_list',
        ],
      }
    );

    const orders = detailsData.response?.order_list || [];

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Erro ao buscar pedidos Shopee:', error);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

// POST - Importar pedido da Shopee para o sistema
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { orderSn } = body;

    if (!orderSn) {
      return NextResponse.json({ error: 'Order SN é obrigatório' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    });

    if (!user?.shopeeAuth) {
      return NextResponse.json({ error: 'Shopee não conectada' }, { status: 400 });
    }

    const { partnerId, partnerKey, shopId, accessToken } = user.shopeeAuth;

    // Buscar detalhes do pedido
    const data = await shopeeRequest(
      '/api/v2/order/get_order_detail',
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        order_sn_list: [orderSn],
        response_optional_fields: [
          'buyer_user_id',
          'buyer_username',
          'recipient_address',
          'actual_shipping_fee',
          'item_list',
        ],
      }
    );

    if (data.error || !data.response?.order_list?.length) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const shopeeOrder = data.response.order_list[0];
    const address = shopeeOrder.recipient_address;

    // Verificar se o pedido já existe
    const existingOrder = await prisma.order.findFirst({
      where: {
        marketplaceOrderId: orderSn,
        marketplaceName: 'SHOPEE',
      },
    });

    if (existingOrder) {
      return NextResponse.json({ error: 'Pedido já importado' }, { status: 400 });
    }

    // Calcular total
    const itemsTotal = shopeeOrder.item_list.reduce(
      (sum: number, item: any) => sum + (item.model_discounted_price || 0) * item.model_quantity,
      0
    );
    const total = itemsTotal + (shopeeOrder.actual_shipping_fee || 0);

    // Criar pedido no sistema
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: 'PENDING',
        total,
        marketplaceName: 'SHOPEE',
        marketplaceOrderId: orderSn,
        buyerName: shopeeOrder.buyer_username || 'Cliente Shopee',
        buyerEmail: `shopee_${shopeeOrder.buyer_user_id}@marketplace.com`,
        buyerPhone: address?.phone || '',
        shippingAddress: JSON.stringify({
          name: address?.name || '',
          phone: address?.phone || '',
          street: address?.full_address || '',
          city: address?.city || '',
          state: address?.state || '',
          zipCode: address?.zipcode || '',
          country: address?.region || 'BR',
        }),
        items: {
          create: await Promise.all(
            shopeeOrder.item_list.map(async (item: any) => {
              // Buscar produto correspondente
              const listing = await prisma.marketplaceListing.findFirst({
                where: {
                  marketplace: 'SHOPEE',
                  listingId: item.item_id.toString(),
                },
              });

              if (!listing) {
                throw new Error(`Produto ${item.item_name} não encontrado no sistema`);
              }

              return {
                productId: listing.productId,
                quantity: item.model_quantity,
                price: item.model_discounted_price || item.model_original_price || 0,
              };
            })
          ),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: 'Pedido importado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao importar pedido Shopee:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao importar pedido' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar status de envio na Shopee
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, trackingNumber } = body;

    if (!orderId || !trackingNumber) {
      return NextResponse.json(
        { error: 'Order ID e Tracking Number são obrigatórios' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    });

    if (!user?.shopeeAuth) {
      return NextResponse.json({ error: 'Shopee não conectada' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || !order.marketplaceOrderId) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const { partnerId, partnerKey, shopId, accessToken } = user.shopeeAuth;

    // Marcar como enviado na Shopee
    const data = await shopeeRequest(
      '/api/v2/logistics/ship_order',
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        order_sn: order.marketplaceOrderId,
        pickup: {
          address_id: 0, // ID do endereço de coleta (precisa configurar)
          pickup_time_id: '', // ID do horário de coleta
        },
      }
    );

    if (data.error) {
      return NextResponse.json({ error: data.message || 'Erro ao atualizar envio' }, { status: 400 });
    }

    // Atualizar tracking no sistema
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        trackingCode: trackingNumber,
      },
    });

    return NextResponse.json({ success: true, message: 'Envio atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar envio Shopee:', error);
    return NextResponse.json({ error: 'Erro ao atualizar envio' }, { status: 500 });
  }
}
