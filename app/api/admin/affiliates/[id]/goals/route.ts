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

    const goals = await prisma.affiliateGoal.findMany({
      where: { affiliateId: params.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Erro ao buscar metas do afiliado:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
