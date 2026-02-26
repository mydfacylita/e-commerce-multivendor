import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getShopifyConfig } from '@/lib/shopify'
import crypto from 'crypto'

/**
 * GET /api/shopify/finalize
 *
 * Chamado após o login quando há uma instalação Shopify pendente.
 * O callbackUrl do login aponta para cá.
 *
 * 1. Verifica se o usuário está logado
 * 2. Lê e valida o cookie shopify_pending (assinado com HMAC)
 * 3. Verifica se o usuário é vendedor ATIVO com assinatura vigente
 * 4. Salva a instalação vinculada ao vendedor
 * 5. Redireciona para /shopify/connect
 */
export async function GET(req: NextRequest) {
  const config = await getShopifyConfig()
  const appUrl = config.appUrl || 'https://www.mydshop.com.br'

  // 1. Verificar sessão
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect(`${appUrl}/login?callbackUrl=${encodeURIComponent('/api/shopify/finalize')}`)
  }

  // 2. Ler e validar cookie pendente
  const pendingCookie = req.cookies.get('shopify_pending')?.value
  if (!pendingCookie) {
    // Sem pendência — redirecionar para o painel do vendedor
    return NextResponse.redirect(`${appUrl}/vendedor/integracao`)
  }

  try {
    const [b64, sig] = pendingCookie.split('.')
    if (!b64 || !sig) throw new Error('Cookie malformado')

    const payload = Buffer.from(b64, 'base64').toString('utf8')
    const expectedSig = crypto.createHmac('sha256', config.apiSecret).update(payload).digest('hex')

    if (sig !== expectedSig) {
      const res = NextResponse.redirect(`${appUrl}/shopify/connect?error=invalid_token`)
      res.cookies.set('shopify_pending', '', { maxAge: 0, path: '/' })
      return res
    }

    const pending = JSON.parse(payload)

    // 3. Verificar expiração (30 min)
    if (Date.now() > pending.exp) {
      const res = NextResponse.redirect(`${appUrl}/shopify/connect?error=expired`)
      res.cookies.set('shopify_pending', '', { maxAge: 0, path: '/' })
      return res
    }

    // 4. Verificar se é vendedor ativo com assinatura vigente
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
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

    const errorBase = `${appUrl}/shopify/connect?shop=${pending.shop}`

    if (!seller) {
      const res = NextResponse.redirect(`${errorBase}&error=no_seller`)
      res.cookies.set('shopify_pending', '', { maxAge: 0, path: '/' })
      return res
    }

    if (seller.status !== 'ACTIVE') {
      const res = NextResponse.redirect(`${errorBase}&error=seller_${seller.status.toLowerCase()}`)
      res.cookies.set('shopify_pending', '', { maxAge: 0, path: '/' })
      return res
    }

    if (seller.subscriptions.length === 0) {
      const res = NextResponse.redirect(`${errorBase}&error=no_subscription`)
      res.cookies.set('shopify_pending', '', { maxAge: 0, path: '/' })
      return res
    }

    // 5. Salvar instalação vinculada ao vendedor
    const existing = await (prisma as any).shopifyInstallation.findUnique({
      where: { shopDomain: pending.shop },
    })

    const data = {
      accessToken:   pending.accessToken,
      scope:         pending.scope,
      userId:        session.user.id,
      shopName:      pending.shopName     || null,
      shopEmail:     pending.shopEmail    || null,
      shopPlan:      pending.shopPlan     || null,
      shopCurrency:  pending.shopCurrency || 'BRL',
      shopTimezone:  pending.shopTimezone || null,
      isActive:      true,
      uninstalledAt: null,
      installedAt:   new Date(),
    }

    if (existing) {
      await (prisma as any).shopifyInstallation.update({ where: { shopDomain: pending.shop }, data })
    } else {
      await (prisma as any).shopifyInstallation.create({ data: { shopDomain: pending.shop, ...data } })
    }

    // 6. Sucesso — limpar cookie e redirecionar
    const res = NextResponse.redirect(`${appUrl}/shopify/connect?shop=${pending.shop}`)
    res.cookies.set('shopify_pending', '', { maxAge: 0, path: '/' })
    return res

  } catch (err: any) {
    console.error('[Shopify Finalize]', err)
    const res = NextResponse.redirect(`${appUrl}/shopify/connect?error=unknown`)
    res.cookies.set('shopify_pending', '', { maxAge: 0, path: '/' })
    return res
  }
}
