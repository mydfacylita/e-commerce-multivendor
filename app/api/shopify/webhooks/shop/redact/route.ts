import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookHmac, getShopifyConfig } from '@/lib/shopify'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/shopify/webhooks/shop/redact
 * 
 * OBRIGATÓRIO pela LGPD/GDPR da Shopify.
 * Chamado 48h após desinstalação do app.
 * Deve remover TODOS os dados da loja (access_token, pedidos, produtos sincronizados).
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

  const { shop_domain } = payload

  try {
    // Remover instalação (cascade remove order_sync e product_sync)
    await (prisma as any).shopifyInstallation.deleteMany({
      where: { shopDomain: shop_domain },
    })

    console.log(`[Shopify GDPR] shop/redact — shop: ${shop_domain} removida`)
  } catch (err) {
    console.error('[Shopify GDPR] shop/redact error:', err)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
