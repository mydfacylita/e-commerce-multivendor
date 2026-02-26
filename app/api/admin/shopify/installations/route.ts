import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/shopify/installations — lista todas as lojas Shopify conectadas */
export async function GET(req: NextRequest) {
  try {
    const installations = await (prisma as any).shopifyInstallation.findMany({
      orderBy: { installedAt: 'desc' },
      include: {
        _count: {
          select: {
            orderSyncs:   true,
            productSyncs: true,
          },
        },
      },
    })

    // Remover access_token da resposta por segurança
    const safe = installations.map((inst: any) => {
      const { accessToken: _t, ...rest } = inst
      return rest
    })

    return NextResponse.json(safe)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
