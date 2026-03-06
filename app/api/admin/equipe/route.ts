import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — listar todos os funcionários
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verificar se é master admin
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { adminStaff: true },
    })
    if (!me || me.adminStaff !== null) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const staff = await prisma.adminStaff.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      staff.map(s => ({
        id: s.id,
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        isActive: s.isActive,
        userActive: s.user.isActive,
        notes: s.notes,
        permissions: JSON.parse(s.permissions || '[]') as string[],
        permissionCount: (JSON.parse(s.permissions || '[]') as string[]).length,
        createdAt: s.createdAt,
      }))
    )
  } catch (error) {
    console.error('Equipe GET error:', error)
    return NextResponse.json({ error: 'Erro ao listar equipe' }, { status: 500 })
  }
}

// POST — criar novo funcionário
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { adminStaff: true },
    })
    if (!me || me.adminStaff !== null) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, password, permissions, notes, cargo } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios' }, { status: 400 })
    }

    // Verificar se já existe
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { adminStaff: true },
    })
    if (existing) {
      // Se já existe, só adicionar AdminStaff se ainda não tiver
      if (existing.adminStaff) {
        return NextResponse.json({ error: 'Este usuário já é funcionário' }, { status: 400 })
      }

      const staff = await prisma.adminStaff.create({
        data: {
          userId: existing.id,
          permissions: JSON.stringify(permissions || []),
          cargo: cargo || null,
          notes: notes || null,
          isActive: true,
        },
      })

      return NextResponse.json({ success: true, staffId: staff.id })
    }

    // Criar novo usuário
    const bcrypt = await import('bcryptjs')
    const hashed = await bcrypt.hash(password, 12)

    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashed,
          role: 'USER',
          isActive: true,
        },
      })

      const staff = await tx.adminStaff.create({
        data: {
          userId: user.id,
          permissions: JSON.stringify(permissions || []),
          cargo: cargo || null,
          notes: notes || null,
          isActive: true,
        },
      })

      return staff
    })

    return NextResponse.json({ success: true, staffId: result.id })
  } catch (error) {
    console.error('Equipe POST error:', error)
    return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 })
  }
}
