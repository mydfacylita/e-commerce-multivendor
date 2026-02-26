import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH - Atualizar configurações do app (nome, descrição, filterConfig)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    // Verifica que o app pertence ao usuário
    const app = await prisma.developerApp.findFirst({
      where: { id: params.id, ownerId: session.user.id }
    })
    if (!app) return NextResponse.json({ error: 'App não encontrado' }, { status: 404 })

    const body = await request.json()
    const { name, description, filterConfig } = body

    const updated = await prisma.developerApp.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(filterConfig !== undefined && { filterConfig }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[developer/apps PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
