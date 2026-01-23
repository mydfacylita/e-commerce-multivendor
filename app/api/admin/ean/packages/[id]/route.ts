import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/admin/ean/packages/[id]
 * Atualiza pacote EAN
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, quantity, price, type, planId, active, displayOrder, popular } = body

    await prisma.$executeRaw`
      UPDATE EANPackage SET
        name = ${name},
        description = ${description || null},
        quantity = ${quantity},
        price = ${price},
        type = ${type},
        planId = ${planId || null},
        active = ${active},
        displayOrder = ${displayOrder},
        popular = ${popular},
        updatedAt = NOW()
      WHERE id = ${params.id}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar pacote:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/ean/packages/[id]
 * Atualiza campo específico (ex: active)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { active } = body

    await prisma.$executeRaw`
      UPDATE EANPackage SET
        active = ${active},
        updatedAt = NOW()
      WHERE id = ${params.id}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ean/packages/[id]
 * Deleta pacote EAN
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await prisma.$executeRaw`
      DELETE FROM EANPackage WHERE id = ${params.id}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar pacote:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar' },
      { status: 500 }
    )
  }
}
