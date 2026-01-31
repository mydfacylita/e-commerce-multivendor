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
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
    })

    if (!supplier) {
      return NextResponse.json(
        { message: 'Fornecedor não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar fornecedor' },
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

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        apiUrl: data.apiUrl,
        apiKey: data.apiKey,
        commission: data.commission,
        isActive: data.active, // Mapear 'active' para 'isActive'
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar fornecedor' },
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

    // Verificar se há produtos deste fornecedor
    const productsCount = await prisma.product.count({
      where: { supplierId: params.id },
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { message: `Não é possível excluir. Existem ${productsCount} produtos vinculados a este fornecedor.` },
        { status: 400 }
      )
    }

    await prisma.supplier.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Fornecedor excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir fornecedor' },
      { status: 500 }
    )
  }
}
