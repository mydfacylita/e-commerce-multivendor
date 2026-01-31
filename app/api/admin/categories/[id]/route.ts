import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { message: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Erro ao buscar categoria:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar categoria' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const data = await req.json()

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId || null,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar categoria' },
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
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Verificar se há produtos nesta categoria
    const productsCount = await prisma.product.count({
      where: { categoryId: params.id },
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { message: `Não é possível excluir. Existem ${productsCount} produtos vinculados a esta categoria.` },
        { status: 400 }
      )
    }

    // Verificar se há subcategorias
    const childrenCount = await prisma.category.count({
      where: { parentId: params.id },
    })

    if (childrenCount > 0) {
      return NextResponse.json(
        { message: `Não é possível excluir. Existem ${childrenCount} subcategorias dentro desta categoria.` },
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Categoria excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir categoria:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir categoria' },
      { status: 500 }
    )
  }
}
