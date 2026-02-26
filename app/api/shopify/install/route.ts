import { NextRequest, NextResponse } from 'next/server'
import { validateShopifyHmac, buildInstallUrl, generateNonce, sanitizeShopDomain, getShopifyConfig } from '@/lib/shopify'

/**
 * GET /api/shopify/install?shop=loja.myshopify.com
 * 
 * Ponto de entrada quando o lojista clica em "Instalar" na Shopify App Store.
 * 1. Valida HMAC dos query params (se presente — Shopify envia hmac na instalação)
 * 2. Gera state (nonce) e salva em cookie
 * 3. Redireciona para tela de autorização OAuth da Shopify
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({ error: 'Parâmetro shop ausente' }, { status: 400 })
  }

  const config = await getShopifyConfig()

  if (!config.apiKey) {
    return NextResponse.json({ error: 'Shopify app não configurado. Configure em Admin > Integração > Shopify.' }, { status: 500 })
  }

  const cleanShop = sanitizeShopDomain(shop)

  // Validar formato do domínio Shopify
  if (!cleanShop.endsWith('.myshopify.com') && !cleanShop.includes('.')) {
    return NextResponse.json({ error: 'Domínio de loja inválido' }, { status: 400 })
  }

  // Validar HMAC se presente (Shopify inclui hmac na requisição de instalação)
  const query: Record<string, string> = {}
  searchParams.forEach((v, k) => { query[k] = v })

  if (query.hmac && !validateShopifyHmac(query, config.apiSecret)) {
    return NextResponse.json({ error: 'HMAC inválido — requisição não autêntica' }, { status: 403 })
  }

  // Gerar nonce para prevenir CSRF
  const state = generateNonce()
  const installUrl = buildInstallUrl(cleanShop, state, config)

  // Salvar state em cookie (1h)
  const response = NextResponse.redirect(installUrl)
  response.cookies.set('shopify_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600,
    path: '/',
  })

  return response
}
