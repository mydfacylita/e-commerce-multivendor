import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/admin/kits/[id]/assign — atribuir kit a um afiliado
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { affiliateId } = await req.json();
    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId é obrigatório' }, { status: 400 });
    }

    const kit = await prisma.affiliateKit.findUnique({ where: { id: params.id } });
    if (!kit) return NextResponse.json({ error: 'Kit não encontrado' }, { status: 404 });

    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!affiliate) return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });

    const assignment = await prisma.affiliateKitAssignment.upsert({
      where: { kitId_affiliateId: { kitId: params.id, affiliateId } },
      update: {},
      create: { kitId: params.id, affiliateId }
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Erro ao atribuir kit:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/admin/kits/[id]/assign?affiliateId=xxx — remover kit de um afiliado
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const affiliateId = searchParams.get('affiliateId');
    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId é obrigatório' }, { status: 400 });
    }

    await prisma.affiliateKitAssignment.deleteMany({
      where: { kitId: params.id, affiliateId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover atribuição:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
