import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** PATCH /api/admin/shopify/installations/[id] — atualizar configurações da instalação */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { isActive, syncOrdersEnabled, syncProductsEnabled } = body

  try {
    const updated = await (prisma as any).shopifyInstallation.update({
      where: { id: params.id },
      data: {
        ...(isActive !== undefined            && { isActive }),
        ...(syncOrdersEnabled !== undefined   && { syncOrdersEnabled }),
        ...(syncProductsEnabled !== undefined && { syncProductsEnabled }),
        ...(isActive === false                && { uninstalledAt: new Date() }),
        ...(isActive === true                 && { uninstalledAt: null }),
      },
    })

    const { accessToken: _t, ...safe } = updated
    return NextResponse.json(safe)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** DELETE /api/admin/shopify/installations/[id] */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await (prisma as any).shopifyInstallation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
