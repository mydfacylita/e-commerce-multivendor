import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '10')

    const logs = await (prisma as any).syncLog?.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit
    }).catch(() => []) || [] // Retorna array vazio se tabela não existir

    return NextResponse.json({ logs })

  } catch (error: any) {
    console.error('Erro ao buscar logs de sincronização:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar logs', error: error.message },
      { status: 500 }
    )
  }
}
