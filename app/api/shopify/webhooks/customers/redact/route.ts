import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookHmac, getShopifyConfig } from '@/lib/shopify'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/shopify/webhooks/customers/redact
 * 
 * OBRIGATÓRIO pela LGPD/GDPR da Shopify.
 * Chamado quando o cliente solicita exclusão dos seus dados.
 * Deve remover todos os dados pessoais relacionados ao customer_id da loja.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') || ''
  const { apiSecret } = await getShopifyConfig()

  if (!validateWebhookHmac(rawBody, hmacHeader, apiSecret)) {
    return NextResponse.json({ error: 'HMAC inválido' }, { status: 401 })
  }

  let payload: any
  try { payload = JSON.parse(rawBody) } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { shop_domain, customer } = payload

  try {
    // Anonimizar dados do comprador nos pedidos importados da Shopify
    // (não excluímos pedidos, apenas anonimizamos dados pessoais)
    await prisma.order.updateMany({
      where: {
        marketplaceName: 'shopify',
        // buscar por email do cliente Shopify
        buyerEmail: customer?.email || '__NOT_FOUND__',
      },
      data: {
        buyerEmail: '[removido]',
        buyerName:  '[removido]',
        buyerPhone: null,
        buyerCpf:   null,
      },
    })

    console.log(`[Shopify GDPR] customers/redact — shop: ${shop_domain}, customer: ${customer?.id}`)
  } catch (err) {
    console.error('[Shopify GDPR] customers/redact error:', err)
  }

  // Shopify exige 200 mesmo em caso de processamento assíncrono
  return NextResponse.json({ received: true }, { status: 200 })
}
