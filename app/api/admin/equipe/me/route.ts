import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/equipe/me — retorna minhas permissões (para filtrar o menu)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { adminStaff: true },
    })

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    // Se não tem adminStaff → é o master admin → acesso total
    if (!user.adminStaff) {
      return NextResponse.json({ isMaster: true, permissions: [] })
    }

    const permissions: string[] = JSON.parse(user.adminStaff.permissions || '[]')
    return NextResponse.json({
      isMaster: false,
      permissions,
      isActive: user.adminStaff.isActive,
      cargo: user.adminStaff.cargo || null,
    })
  } catch (error) {
    console.error('Equipe me error:', error)
    return NextResponse.json({ isMaster: true, permissions: [] })
  }
}
