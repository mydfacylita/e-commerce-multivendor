import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET - Buscar vendedor específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const seller = await prisma.seller.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ seller });
  } catch (error) {
    console.error('Erro ao buscar vendedor:', error);
    return NextResponse.json({ error: 'Erro ao buscar vendedor' }, { status: 500 });
  }
}

// PUT - Atualizar status do vendedor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { status, commission } = body;

    // Validar status
    const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const seller = await prisma.seller.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(commission !== undefined && { commission }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ seller });
  } catch (error) {
    console.error('Erro ao atualizar vendedor:', error);
    return NextResponse.json({ error: 'Erro ao atualizar vendedor' }, { status: 500 });
  }
}

// DELETE - Deletar vendedor (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Marcar vendedor como rejeitado ao invés de deletar
    await prisma.seller.update({
      where: { id: params.id },
      data: { status: 'REJECTED' },
    });

    return NextResponse.json({ message: 'Vendedor removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover vendedor:', error);
    return NextResponse.json({ error: 'Erro ao remover vendedor' }, { status: 500 });
  }
}
