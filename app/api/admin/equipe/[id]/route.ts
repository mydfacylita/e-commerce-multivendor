import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function isMasterAdmin(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { adminStaff: true },
  })
  return user && user.adminStaff === null && user.role === 'ADMIN'
}

// GET — buscar funcionário por ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!(await isMasterAdmin(session.user.email))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const staff = await prisma.adminStaff.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, name: true, email: true, isActive: true, createdAt: true } } },
    })

    if (!staff) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

    return NextResponse.json({
      id: staff.id,
      userId: staff.userId,
      name: staff.user.name,
      email: staff.user.email,
      isActive: staff.isActive,
      userActive: staff.user.isActive,
      notes: staff.notes,
      cargo: staff.cargo || null,
      permissions: JSON.parse(staff.permissions || '[]') as string[],
      createdAt: staff.createdAt,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH — atualizar permissões / status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!(await isMasterAdmin(session.user.email))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await req.json()
    const { permissions, isActive, notes, name, password, cargo } = body

    const staff = await prisma.adminStaff.findUnique({ where: { id: params.id } })
    if (!staff) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

    // Atualizar AdminStaff
    const updates: any = {}
    if (permissions !== undefined) updates.permissions = JSON.stringify(permissions)
    if (isActive !== undefined) updates.isActive = isActive
    if (notes !== undefined) updates.notes = notes
    if (cargo !== undefined) updates.cargo = cargo || null

    await prisma.adminStaff.update({ where: { id: params.id }, data: updates })

    // Atualizar User se necessário
    const userUpdates: any = {}
    if (name !== undefined) userUpdates.name = name
    if (isActive !== undefined) userUpdates.isActive = isActive
    if (password) {
      const bcrypt = await import('bcryptjs')
      userUpdates.password = await bcrypt.hash(password, 12)
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({ where: { id: staff.userId }, data: userUpdates })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE — remover funcionário (remove AdminStaff e rebaixa role)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!(await isMasterAdmin(session.user.email))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const staff = await prisma.adminStaff.findUnique({ where: { id: params.id } })
    if (!staff) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

    await prisma.$transaction([
      prisma.adminStaff.delete({ where: { id: params.id } }),
      prisma.user.update({ where: { id: staff.userId }, data: { role: 'USER' } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
