import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const installation = await prisma.shopifyInstallation.findFirst({
    where: { userId: session.user.id, isActive: true },
  })

  if (!installation) {
    return NextResponse.json({ error: 'Nenhuma loja Shopify conectada' }, { status: 404 })
  }

  await prisma.shopifyInstallation.update({
    where: { id: installation.id },
    data: {
      isActive: false,
      uninstalledAt: new Date(),
      userId: null, // desvincula do usuário
    },
  })

  return NextResponse.json({ success: true })
}
