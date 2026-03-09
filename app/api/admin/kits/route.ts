import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const kits = await prisma.affiliateKit.findMany({
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true, price: true, images: true, slug: true }
            }
          }
        },
        _count: { select: { assignments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ kits });
  } catch (error) {
    console.error('Erro ao buscar kits:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, description, productIds } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do kit é obrigatório' }, { status: 400 });
    }

    const kit = await prisma.affiliateKit.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        products: productIds?.length
          ? { create: productIds.map((pid: string) => ({ productId: pid })) }
          : undefined
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

    return NextResponse.json({ kit }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar kit:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
