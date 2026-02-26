import { NextRequest, NextResponse } from 'next/server'
import {
  validateShopifyHmac,
  exchangeAccessToken,
  getShopInfo,
  sanitizeShopDomain,
  getShopifyConfig,
} from '@/lib/shopify'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/shopify/callback?shop=...&code=...&state=...&hmac=...
 *
 * Shopify redireciona aqui após o lojista autorizar o app.
 * 1. Valida HMAC dos query params
 * 2. Valida state (anti-CSRF)
 * 3. Troca code por access_token
 * 4. Busca info da loja
 * 5. Salva/atualiza instalação no banco (ShopifyInstallation)
 * 6. Vincula conta Mydshop pelo e-mail (hybrid: auto-link ou auto-create)
 * 7. Redireciona para página de boas-vindas
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const shop  = searchParams.get('shop')
  const code  = searchParams.get('code')
  const state = searchParams.get('state')

  if (!shop || !code) {
    return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 })
  }

  // Carregar config do banco antes de validar HMAC
  const config = await getShopifyConfig()

  if (!config.apiKey) {
    return NextResponse.json({ error: 'Shopify app não configurado. Configure em Admin > Integração > Shopify.' }, { status: 500 })
  }

  // 1. Validar HMAC
  const query: Record<string, string> = {}
  searchParams.forEach((v, k) => { query[k] = v })

  if (!validateShopifyHmac(query, config.apiSecret)) {
    return NextResponse.json({ error: 'HMAC inválido' }, { status: 403 })
  }

  // 2. Validar state (anti-CSRF)
  const cookieState = req.cookies.get('shopify_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.json({ error: 'State inválido — possível ataque CSRF' }, { status: 403 })
  }

  const cleanShop = sanitizeShopDomain(shop)

  try {
    // 3. Trocar code por access_token
    const tokenData = await exchangeAccessToken(cleanShop, code, config)

    // 4. Buscar informações da loja
    let shopInfo
    try {
      shopInfo = await getShopInfo(cleanShop, tokenData.access_token)
    } catch {
      shopInfo = null
    }

    // 5. Vincular conta Mydshop pelo e-mail (hybrid account linking)
    let userId: string | null = null
    const shopEmail = shopInfo?.email || tokenData.associated_user?.email || null

    if (shopEmail) {
      // Tentar encontrar usuário existente
      const existingUser = await prisma.user.findUnique({ where: { email: shopEmail } })

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Auto-criar conta de vendedor Mydshop
        try {
          const newUser = await prisma.user.create({
            data: {
              email:    shopEmail,
              name:     shopInfo?.name || `Loja ${cleanShop}`,
              role:     'USER',
              isActive: true,
            },
          })
          userId = newUser.id
        } catch {
          // Se falhar criação (ex: race condition), tentar buscar novamente
          const retry = await prisma.user.findUnique({ where: { email: shopEmail } })
          userId = retry?.id || null
        }
      }
    }

    // 6. Salvar/atualizar instalação
    const existing = await (prisma as any).shopifyInstallation.findUnique({
      where: { shopDomain: cleanShop },
    })

    if (existing) {
      await (prisma as any).shopifyInstallation.update({
        where: { shopDomain: cleanShop },
        data: {
          accessToken:   tokenData.access_token,
          scope:         tokenData.scope,
          userId:        userId || existing.userId,
          shopName:      shopInfo?.name     || existing.shopName,
          shopEmail:     shopEmail          || existing.shopEmail,
          shopPlan:      shopInfo?.plan_name || existing.shopPlan,
          shopCurrency:  shopInfo?.currency  || existing.shopCurrency,
          shopTimezone:  shopInfo?.iana_timezone || existing.shopTimezone,
          isActive:      true,
          uninstalledAt: null,
          installedAt:   new Date(),
        },
      })
    } else {
      await (prisma as any).shopifyInstallation.create({
        data: {
          shopDomain:   cleanShop,
          accessToken:  tokenData.access_token,
          scope:        tokenData.scope,
          userId:       userId,
          shopName:     shopInfo?.name      || null,
          shopEmail:    shopEmail           || null,
          shopPlan:     shopInfo?.plan_name || null,
          shopCurrency: shopInfo?.currency  || 'BRL',
          shopTimezone: shopInfo?.iana_timezone || null,
          isActive:     true,
        },
      })
    }

    // 7. Redirecionar para boas-vindas (limpar cookie)
    const redirect = NextResponse.redirect(`${config.appUrl}/shopify/connect?shop=${cleanShop}`)
    redirect.cookies.set('shopify_state', '', { maxAge: 0, path: '/' })
    return redirect

  } catch (err: any) {
    console.error('[Shopify Callback]', err)
    return NextResponse.json({ error: 'Erro ao processar instalação', detail: err.message }, { status: 500 })
  }
}
