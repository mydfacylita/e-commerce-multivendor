import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/shopify/seller-info?shop=loja.myshopify.com
 * Retorna informações do vendedor logado + detalhes da instalação Shopify.
 * Usado pela página /shopify/connect para exibir os dados corretos.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const shop = req.nextUrl.searchParams.get('shop')

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
        include: { plan: { select: { name: true } } },
      },
      _count: {
        select: { products: true },
      },
    },
  })

  if (!seller) {
    return NextResponse.json({ error: 'no_seller' }, { status: 404 })
  }

  const installation = shop
    ? await (prisma as any).shopifyInstallation.findUnique({
        where: { shopDomain: shop },
        select: {
          shopName:     true,
          shopPlan:     true,
          shopCurrency: true,
          installedAt:  true,
          isActive:     true,
          userId:       true,
        },
      })
    : null

  return NextResponse.json({
    seller: {
      storeName:    seller.storeName,
      storeSlug:    seller.storeSlug,
      storeLogo:    seller.storeLogo,
      status:       seller.status,
      productsCount: seller._count.products,
    },
    subscription: seller.subscriptions[0]
      ? {
          planName:  seller.subscriptions[0].plan?.name || 'Plano',
          status:    seller.subscriptions[0].status,
          endDate:   seller.subscriptions[0].endDate,
        }
      : null,
    installation,
  })
}
