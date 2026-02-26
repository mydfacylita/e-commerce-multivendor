import { NextRequest, NextResponse } from 'next/server'
import {
  validateShopifyHmac,
  exchangeAccessToken,
  getShopInfo,
  sanitizeShopDomain,
  getShopifyConfig,
} from '@/lib/shopify'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * GET /api/shopify/callback
 *
 * Fluxo correto:
 * 1. Valida HMAC + state (anti-CSRF)
 * 2. Troca code por access_token
 * 3. Verifica se o usuário está logado na MydShop
 *    - NÃO logado: salva dados em cookie seguro → redireciona para /login?callbackUrl=/api/shopify/finalize
 *    - Logado: verifica se é vendedor ATIVO com assinatura vigente → salva instalação → sucesso
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const shop  = searchParams.get('shop')
  const code  = searchParams.get('code')
  const state = searchParams.get('state')

  if (!shop || !code) {
    return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 })
  }

  const config = await getShopifyConfig()
  if (!config.apiKey) {
    return NextResponse.json({ error: 'Shopify app não configurado.' }, { status: 500 })
  }

  // 1. Validar HMAC
  const query: Record<string, string> = {}
  searchParams.forEach((v, k) => { query[k] = v })
  if (!validateShopifyHmac(query, config.apiSecret)) {
    return NextResponse.json({ error: 'HMAC inválido' }, { status: 403 })
  }

  // 2. Validar state (CSRF)
  const cookieState = req.cookies.get('shopify_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.json({ error: 'State inválido — possível ataque CSRF' }, { status: 403 })
  }

  const cleanShop = sanitizeShopDomain(shop)

  try {
    // 3. Trocar code por access_token
    const tokenData = await exchangeAccessToken(cleanShop, code, config)

    // 4. Buscar info da loja Shopify
    let shopInfo: any = null
    try { shopInfo = await getShopInfo(cleanShop, tokenData.access_token) } catch {}

    // 5. Verificar sessão MydShop
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      // Usuário NÃO está logado na MydShop
      // Salvar dados da instalação pendente em cookie assinado (30 min)
      const pendingPayload = JSON.stringify({
        shop:         cleanShop,
        accessToken:  tokenData.access_token,
        scope:        tokenData.scope,
        shopName:     shopInfo?.name          || null,
        shopEmail:    shopInfo?.email         || null,
        shopPlan:     shopInfo?.plan_name     || null,
        shopCurrency: shopInfo?.currency      || 'BRL',
        shopTimezone: shopInfo?.iana_timezone || null,
        exp:          Date.now() + 30 * 60 * 1000,
      })
      const sig = crypto.createHmac('sha256', config.apiSecret).update(pendingPayload).digest('hex')
      const pendingValue = Buffer.from(pendingPayload).toString('base64') + '.' + sig

      const loginUrl = `${config.appUrl}/login?callbackUrl=${encodeURIComponent('/api/shopify/finalize')}`
      const res = NextResponse.redirect(loginUrl)
      res.cookies.set('shopify_pending', pendingValue, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   1800,
        path:     '/',
        domain:   process.env.NODE_ENV === 'production' ? '.mydshop.com.br' : undefined,
      })
      res.cookies.set('shopify_state', '', { maxAge: 0, path: '/' })
      return res
    }

    // 6. Usuário está logado — verificar se é vendedor ativo com assinatura
    const errorBase = `${config.appUrl}/shopify/connect`
    const validationError = await validateSeller(session.user.id, config.appUrl)
    if (validationError) {
      const res = NextResponse.redirect(`${errorBase}?error=${validationError}&shop=${cleanShop}`)
      res.cookies.set('shopify_state', '', { maxAge: 0, path: '/' })
      return res
    }

    // 7. Salvar instalação vinculada ao vendedor
    await upsertInstallation(cleanShop, tokenData, shopInfo, session.user.id)

    const res = NextResponse.redirect(`${config.appUrl}/shopify/connect?shop=${cleanShop}`)
    res.cookies.set('shopify_state', '', { maxAge: 0, path: '/' })
    return res

  } catch (err: any) {
    console.error('[Shopify Callback]', err)
    return NextResponse.json({ error: 'Erro ao processar instalação', detail: err.message }, { status: 500 })
  }
}

/**
 * Verifica se o usuário é um vendedor ATIVO com assinatura vigente.
 * Retorna null se ok, ou uma string de erro se não.
 */
async function validateSeller(userId: string, appUrl: string): Promise<string | null> {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    include: {
      subscriptions: {
        where: {
          status:  { in: ['ACTIVE', 'TRIAL'] },
          endDate: { gt: new Date() },
        },
        orderBy: { endDate: 'desc' },
        take: 1,
      },
    },
  })

  if (!seller)                        return 'no_seller'
  if (seller.status !== 'ACTIVE')     return `seller_${seller.status.toLowerCase()}`
  if (seller.subscriptions.length === 0) return 'no_subscription'
  return null
}

/** Cria ou atualiza o registro de instalação Shopify. */
async function upsertInstallation(
  cleanShop: string,
  tokenData: any,
  shopInfo: any,
  userId: string,
) {
  const data = {
    accessToken:   tokenData.access_token,
    scope:         tokenData.scope,
    userId,
    shopName:      shopInfo?.name          || null,
    shopEmail:     shopInfo?.email         || null,
    shopPlan:      shopInfo?.plan_name     || null,
    shopCurrency:  shopInfo?.currency      || 'BRL',
    shopTimezone:  shopInfo?.iana_timezone || null,
    isActive:      true,
    uninstalledAt: null,
    installedAt:   new Date(),
  }

  const existing = await (prisma as any).shopifyInstallation.findUnique({
    where: { shopDomain: cleanShop },
  })

  if (existing) {
    await (prisma as any).shopifyInstallation.update({ where: { shopDomain: cleanShop }, data })
  } else {
    await (prisma as any).shopifyInstallation.create({ data: { shopDomain: cleanShop, ...data } })
  }
}
