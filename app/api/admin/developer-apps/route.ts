import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
}

// GET - Listar todos os apps de desenvolvedores
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isAdmin(session)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const apps = await prisma.developerApp.findMany({
      where: { status: { not: 'DELETED' } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        apiKeys: { select: { id: true, name: true, isActive: true, requestCount: true, lastUsedAt: true, scopes: true } },
        _count: { select: { apiLogs: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ data: apps })
  } catch (err: any) {
    if (err?.code === 'P2021' || err?.message?.includes("doesn't exist")) {
      return NextResponse.json({ data: [], _migrationPending: true })
    }
    console.error('[admin/developer-apps GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
