import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const connections = await prisma.shopeeAuth.findMany({
      where: {
        // Somente vendedores (não o admin)
        user: { role: { not: 'ADMIN' } },
        accessToken: { not: '' },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            seller: {
              select: {
                id: true,
                storeName: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Erro ao listar conexões Shopee:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
