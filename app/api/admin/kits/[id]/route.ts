import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const kit = await prisma.affiliateKit.findUnique({
      where: { id: params.id },
      include: {
        products: {
          include: {
            product: { select: { id: true, name: true, price: true, images: true, slug: true } }
          }
        },
        assignments: {
          include: {
            affiliate: { select: { id: true, name: true, code: true, email: true, status: true } }
          },
          orderBy: { assignedAt: 'desc' }
        }
      }
    });

    if (!kit) return NextResponse.json({ error: 'Kit não encontrado' }, { status: 404 });

    return NextResponse.json({ kit });
  } catch (error) {
    console.error('Erro ao buscar kit:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, description, isActive } = await req.json();

    const kit = await prisma.affiliateKit.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      },
      include: {
        products: {
          include: {
            product: { select: { id: true, name: true, price: true, images: true, slug: true } }
          }
        },
        _count: { select: { assignments: true } }
      }
    });

    return NextResponse.json({ kit });
  } catch (error) {
    console.error('Erro ao atualizar kit:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.affiliateKit.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar kit:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
