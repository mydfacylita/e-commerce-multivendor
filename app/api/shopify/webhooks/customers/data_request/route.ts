import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookHmac, getShopifyConfig } from '@/lib/shopify'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/shopify/webhooks/customers/data_request
 * 
 * OBRIGATÓRIO pela LGPD/GDPR da Shopify.
 * Chamado quando cliente solicita relatório dos seus dados armazenados.
 * Deve enviar relatório para o e-mail do lojista dentro de 30 dias.
 * 
 * Em produção: implemente envio de e-mail com os dados do cliente.
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

  const { shop_domain, customer, data_request } = payload

  // TODO: implementar envio por e-mail dos dados do cliente para o lojista
  console.log(`[Shopify GDPR] customers/data_request — shop: ${shop_domain}, customer: ${customer?.id}, request_id: ${data_request?.id}`)

  // Shopify exige 200. O app tem até 30 dias para enviar o relatório.
  return NextResponse.json({ received: true }, { status: 200 })
}
