import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Lista todas as conexões de redes sociais
 * GET /api/social/connections
 * 🔐 Requer ADMIN
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const connections = await prisma.socialConnection.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        platformId: true,
        name: true,
        isActive: true,
        expiresAt: true,
        metadata: true,
        createdAt: true,
        _count: {
          select: {
            posts: true
          }
        }
      }
    })

    return NextResponse.json(connections)
  } catch (error) {
    console.error('Erro ao buscar conexões:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar conexões' },
      { status: 500 }
    )
  }
}

/**
 * Desconecta uma rede social
 * DELETE /api/social/connections?id=xxx
 * 🔐 Requer ADMIN
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da conexão não informado' },
        { status: 400 }
      )
    }

    await prisma.socialConnection.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao desconectar:', error)
    return NextResponse.json(
      { error: 'Erro ao desconectar' },
      { status: 500 }
    )
  }
}
