import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Função para verificar assinatura do webhook
function verifyShopeeWebhook(body: string, signature: string, partnerKey: string): boolean {
  const hash = crypto.createHmac('sha256', partnerKey).update(body).digest('hex');
  return hash === signature;
}

// POST - Receber notificações da Shopee
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('authorization') || '';
    
    // Parse do corpo
    const data = JSON.parse(rawBody);
    const { code, shop_id, data: eventData } = data;

    console.log('Webhook Shopee recebido:', { code, shop_id, eventData });

    // Buscar autenticação do shop
    const shopeeAuth = await prisma.shopeeAuth.findFirst({
      where: { shopId: shop_id },
    });

    if (!shopeeAuth) {
      console.error('Shop não encontrado:', shop_id);
      return NextResponse.json({ error: 'Shop não encontrado' }, { status: 404 });
    }

    // Verificar assinatura
    const isValid = verifyShopeeWebhook(rawBody, signature, shopeeAuth.partnerKey);
    if (!isValid) {
      console.error('Assinatura inválida do webhook');
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    // Processar diferentes tipos de eventos
    switch (code) {
      case 1: // Order Status Changed
        await handleOrderStatusChange(eventData, shopeeAuth.userId);
        break;

      case 2: // New Order
        await handleNewOrder(eventData, shopeeAuth.userId);
        break;

      case 3: // Order Cancellation
        await handleOrderCancellation(eventData, shopeeAuth.userId);
        break;

      case 10: // Product Status Change
        await handleProductStatusChange(eventData);
        break;

      default:
        console.log('Evento não tratado:', code);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao processar webhook Shopee:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}

// Handler para mudança de status do pedido
async function handleOrderStatusChange(data: any, userId: string) {
  const { order_sn, order_status } = data;

  const order = await prisma.order.findFirst({
    where: {
      marketplaceOrderId: order_sn,
      marketplaceName: 'SHOPEE',
    },
  });

  if (!order) {
    console.log('Pedido não encontrado no sistema:', order_sn);
    return;
  }

  // Mapear status da Shopee para status do sistema
  let status = order.status;
  switch (order_status) {
    case 'READY_TO_SHIP':
      status = 'PENDING';
      break;
    case 'SHIPPED':
      status = 'SHIPPED';
      break;
    case 'COMPLETED':
      status = 'DELIVERED';
      break;
    case 'CANCELLED':
      status = 'CANCELLED';
      break;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status },
  });

  console.log('Status do pedido atualizado:', order_sn, status);
}

// Handler para novo pedido
async function handleNewOrder(data: any, userId: string) {
  const { order_sn } = data;
  
  console.log('Novo pedido recebido:', order_sn);
  
  // Aqui você pode implementar importação automática ou enviar notificação
  // Por enquanto, apenas logamos
}

// Handler para cancelamento de pedido
async function handleOrderCancellation(data: any, userId: string) {
  const { order_sn } = data;

  const order = await prisma.order.findFirst({
    where: {
      marketplaceOrderId: order_sn,
      marketplaceName: 'SHOPEE',
    },
  });

  if (order) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });

    console.log('Pedido cancelado:', order_sn);
  }
}

// Handler para mudança de status do produto
async function handleProductStatusChange(data: any) {
  const { item_id, status } = data;

  const listing = await prisma.marketplaceListing.findFirst({
    where: {
      marketplace: 'SHOPEE',
      listingId: item_id.toString(),
    },
  });

  if (listing) {
    let listingStatus = 'active';
    if (status === 'BANNED' || status === 'DELETED') {
      listingStatus = 'closed';
    } else if (status === 'UNLIST') {
      listingStatus = 'paused';
    }

    await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { status: listingStatus },
    });

    console.log('Status do produto atualizado:', item_id, listingStatus);
  }
}
