import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST — adicionar produto ao kit
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: 'productId é obrigatório' }, { status: 400 });
    }

    const item = await prisma.affiliateKitProduct.upsert({
      where: { kitId_productId: { kitId: params.id, productId } },
      update: {},
      create: { kitId: params.id, productId }
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE — remover produto do kit
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId é obrigatório' }, { status: 400 });
    }

    await prisma.affiliateKitProduct.deleteMany({
      where: { kitId: params.id, productId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover produto:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
