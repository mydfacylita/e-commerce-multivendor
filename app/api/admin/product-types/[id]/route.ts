import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      )
    }

    const data = await req.json()

    const productType = await prisma.productType.update({
      where: { id: params.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        active: data.active,
      },
    })

    return NextResponse.json(productType)
  } catch (error) {
    console.error('Erro ao atualizar tipo de produto:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar tipo de produto' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      )
    }

    await prisma.productType.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Tipo excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir tipo de produto:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir tipo de produto' },
      { status: 500 }
    )
  }
}
