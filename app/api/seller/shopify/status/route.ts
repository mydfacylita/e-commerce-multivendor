import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Busca o seller do usuário logado
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { seller: true, workForSeller: true },
  })

  const seller = user?.seller ?? user?.workForSeller
  if (!seller) return NextResponse.json({ connected: false })

  // Busca instalação ativa vinculada a este userId
  const installation = await prisma.shopifyInstallation.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: {
      _count: { select: { orderSyncs: true, productSyncs: true } },
    },
  })

  if (!installation) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected: true,
    installation: {
      shopDomain: installation.shopDomain,
      shopName: installation.shopName,
      shopPlan: installation.shopPlan,
      shopEmail: installation.shopEmail,
      isActive: installation.isActive,
      installedAt: installation.installedAt.toISOString(),
      lastSyncAt: installation.lastSyncAt?.toISOString() ?? null,
      syncOrdersEnabled: installation.syncOrdersEnabled,
      syncProductsEnabled: installation.syncProductsEnabled,
      orderSyncsCount: installation._count.orderSyncs,
      productSyncsCount: installation._count.productSyncs,
    },
  })
}
