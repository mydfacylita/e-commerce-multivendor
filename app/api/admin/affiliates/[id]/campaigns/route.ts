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

    const participations = await prisma.affiliateCampaignParticipant.findMany({
      where: { affiliateId: params.id },
      include: {
        campaign: {
          select: { id: true, title: true, startDate: true, endDate: true, isActive: true }
        }
      },
      orderBy: { invitedAt: 'desc' }
    });

    return NextResponse.json({ participations });
  } catch (error) {
    console.error('Erro ao buscar campanhas do afiliado:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
