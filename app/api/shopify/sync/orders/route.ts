import { NextRequest, NextResponse } from 'next/server'
import { getShopifyOrders, sanitizeShopDomain } from '@/lib/shopify'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/shopify/sync/orders
 * Body: { shop: string, since?: string (ISO date) }
 * 
 * Importa pedidos da Shopify para o Mydshop.
 * Chamado manualmente ou via cron job.
 */
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { shop, since } = body

  if (!shop) {
    return NextResponse.json({ error: 'shop é obrigatório' }, { status: 400 })
  }

  const cleanShop = sanitizeShopDomain(shop)

  // Buscar instalação ativa
  const installation = await (prisma as any).shopifyInstallation.findUnique({
    where: { shopDomain: cleanShop },
  })

  if (!installation || !installation.isActive) {
    return NextResponse.json({ error: 'Loja não encontrada ou inativa' }, { status: 404 })
  }

  if (!installation.syncOrdersEnabled) {
    return NextResponse.json({ message: 'Sincronização de pedidos desabilitada para esta loja' }, { status: 200 })
  }

  const results = { imported: 0, skipped: 0, failed: 0, errors: [] as string[] }

  try {
    const sinceDate = since || installation.lastSyncAt?.toISOString() || undefined
    const shopifyOrders = await getShopifyOrders(cleanShop, installation.accessToken, {
      created_at_min: sinceDate,
      status: 'any',
      limit: 250,
    })

    for (const shopifyOrder of shopifyOrders) {
      const orderId = String(shopifyOrder.id)

      // Verificar se já foi sincronizado
      const existing = await (prisma as any).shopifyOrderSync.findUnique({
        where: {
          installationId_shopifyOrderId: {
            installationId: installation.id,
            shopifyOrderId: orderId,
          },
        },
      })

      if (existing?.status === 'synced') {
        results.skipped++
        continue
      }

      try {
        // Montar endereço de entrega
        const addr = shopifyOrder.shipping_address || shopifyOrder.billing_address
        const shippingAddress = addr ? JSON.stringify({
          street:       `${addr.address1}${addr.address2 ? ', ' + addr.address2 : ''}`,
          city:         addr.city,
          state:        addr.province,
          zipCode:      addr.zip,
          country:      addr.country,
          recipientName: `${addr.first_name} ${addr.last_name}`.trim(),
          phone:        addr.phone || shopifyOrder.customer?.phone || null,
        }) : '{}'

        // Criar pedido no Mydshop
        const order = await prisma.order.create({
          data: {
            marketplaceName:    'shopify',
            marketplaceOrderId: `shopify_${orderId}`,
            buyerEmail:         shopifyOrder.customer?.email || shopifyOrder.email || null,
            buyerName:          shopifyOrder.customer
              ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`.trim()
              : null,
            buyerPhone:    shopifyOrder.customer?.phone   || null,
            total:         parseFloat(shopifyOrder.total_price),
            subtotal:      parseFloat(shopifyOrder.subtotal_price),
            shippingCost:  shopifyOrder.shipping_lines?.[0]
              ? parseFloat(shopifyOrder.shipping_lines[0].price)
              : 0,
            shippingAddress,
            paymentMethod: shopifyOrder.financial_status || null,
            paymentStatus: shopifyOrder.financial_status,
            status:        mapShopifyStatus(shopifyOrder.financial_status, shopifyOrder.fulfillment_status),
            sellerId:      installation.userId || null,
            items: {
              create: shopifyOrder.line_items.map(item => ({
                productId: item.product_id ? String(item.product_id) : 'shopify-unknown',
                quantity:  item.quantity,
                price:     parseFloat(item.price),
                total:     parseFloat(item.price) * item.quantity,
              })),
            },
          },
        })

        // Registrar sync bem-sucedido
        await (prisma as any).shopifyOrderSync.upsert({
          where: {
            installationId_shopifyOrderId: {
              installationId: installation.id,
              shopifyOrderId: orderId,
            },
          },
          update: { status: 'synced', mydOrderId: order.id, syncedAt: new Date(), errorMessage: null },
          create: {
            installationId:     installation.id,
            shopifyOrderId:     orderId,
            shopifyOrderNumber: String(shopifyOrder.order_number),
            mydOrderId:         order.id,
            status:             'synced',
            syncedAt:           new Date(),
          },
        })

        results.imported++
      } catch (err: any) {
        results.failed++
        results.errors.push(`Pedido ${orderId}: ${err.message}`)

        await (prisma as any).shopifyOrderSync.upsert({
          where: {
            installationId_shopifyOrderId: {
              installationId: installation.id,
              shopifyOrderId: orderId,
            },
          },
          update: { status: 'failed', errorMessage: err.message },
          create: {
            installationId: installation.id,
            shopifyOrderId: orderId,
            status:         'failed',
            errorMessage:   err.message,
          },
        })
      }
    }

    // Atualizar lastSyncAt
    await (prisma as any).shopifyInstallation.update({
      where: { id: installation.id },
      data:  { lastSyncAt: new Date() },
    })

    return NextResponse.json({
      message: 'Sincronização concluída',
      shop:    cleanShop,
      ...results,
    })
  } catch (err: any) {
    console.error('[Shopify Sync Orders]', err)
    return NextResponse.json({ error: 'Erro ao sincronizar pedidos', detail: err.message }, { status: 500 })
  }
}

/**
 * Mapeia status Shopify → OrderStatus Mydshop
 * Enum válidos: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED
 */
function mapShopifyStatus(
  financialStatus: string,
  fulfillmentStatus: string | null
): 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' {
  if (financialStatus === 'voided')                         return 'CANCELLED'
  if (fulfillmentStatus === 'fulfilled')                    return 'DELIVERED'
  if (fulfillmentStatus === 'partial')                      return 'SHIPPED'
  if (financialStatus === 'paid' && !fulfillmentStatus)     return 'PROCESSING'
  return 'PENDING'
}
