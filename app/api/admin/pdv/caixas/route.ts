import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const caixas = await prisma.pdvCaixa.findMany({
    orderBy: { numero: 'asc' },
    include: {
      sessoes: {
        where: { status: 'ABERTA' },
        take: 1,
        include: { _count: { select: { vendas: true } } }
      }
    }
  })
  return NextResponse.json(caixas)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { nome, numero, branchId } = await req.json()
  if (!nome || !numero) return NextResponse.json({ error: 'Nome e número obrigatórios' }, { status: 400 })

  const caixa = await prisma.pdvCaixa.create({
    data: { nome, numero: parseInt(numero), branchId: branchId || null }
  })
  return NextResponse.json(caixa, { status: 201 })
}
