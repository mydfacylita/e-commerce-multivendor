import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Verificar status da autenticação do vendedor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (!user.shopeeAuth) {
      return NextResponse.json({ isConnected: false })
    }

    const isExpired = new Date(user.shopeeAuth.expiresAt) < new Date()

    return NextResponse.json({
      isConnected: !isExpired,
      shopId: user.shopeeAuth.shopId,
      partnerId: user.shopeeAuth.partnerId,
      merchantName: user.shopeeAuth.merchantName,
      region: user.shopeeAuth.region,
      expiresAt: user.shopeeAuth.expiresAt,
    })
  } catch (error) {
    console.error('Erro ao verificar status Shopee (seller):', error)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}

// POST - Salvar credenciais (Partner ID e Partner Key)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { partnerId, partnerKey } = await request.json()

    if (!partnerId || !partnerKey) {
      return NextResponse.json(
        { error: 'Partner ID e Partner Key são obrigatórios' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const shopeeAuth = await prisma.shopeeAuth.upsert({
      where: { userId: user.id },
      update: { partnerId, partnerKey },
      create: {
        userId: user.id,
        partnerId,
        partnerKey,
        shopId: 0,
        accessToken: '',
        refreshToken: '',
        expiresAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, partnerId: shopeeAuth.partnerId })
  } catch (error) {
    console.error('Erro ao salvar credenciais Shopee (seller):', error)
    return NextResponse.json({ error: 'Erro ao salvar credenciais' }, { status: 500 })
  }
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
