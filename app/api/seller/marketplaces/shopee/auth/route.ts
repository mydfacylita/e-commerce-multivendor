import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Verificar se admin configurou + status do vendedor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verifica se admin configurou as credenciais do app Shopee
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { shopeeAuth: true },
    })

    const adminConfigured = !!(adminUser?.shopeeAuth?.partnerId && adminUser?.shopeeAuth?.partnerKey)

    // Status do próprio vendedor
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    })

    if (!user?.shopeeAuth || !user.shopeeAuth.accessToken) {
      return NextResponse.json({ isConnected: false, adminConfigured })
    }

    const isExpired = new Date(user.shopeeAuth.expiresAt) < new Date()

    return NextResponse.json({
      isConnected: !isExpired,
      adminConfigured,
      shopId: user.shopeeAuth.shopId,
      merchantName: user.shopeeAuth.merchantName,
      region: user.shopeeAuth.region,
      expiresAt: user.shopeeAuth.expiresAt,
    })
  } catch (error) {
    console.error('Erro ao verificar status Shopee (seller):', error)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}

// POST - não usado no modelo centralizado (admin configura)
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Use /admin/integracao/shopee para configurar credenciais' }, { status: 403 })
}

// DELETE - Desconectar
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    await prisma.shopeeAuth.delete({ where: { userId: user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao desconectar Shopee (seller):', error)
    return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 })
  }
}
