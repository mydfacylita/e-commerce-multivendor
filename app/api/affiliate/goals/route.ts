import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id }
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    const now = new Date();

    // Metas globais (affiliateId null) + metas específicas deste afiliado
    const goals = await prisma.affiliateGoal.findMany({
      where: {
        isActive: true,
        OR: [
          { affiliateId: null },
          { affiliateId: affiliate.id }
        ]
      },
      orderBy: { endDate: 'asc' }
    });

    // Calcular progresso para cada meta
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const dateFilter = {
          gte: goal.startDate,
          lte: goal.endDate
        };

        let currentValue = 0;

        if (goal.type === 'SALES_AMOUNT') {
          const result = await prisma.affiliateSale.aggregate({
            where: {
              affiliateId: affiliate.id,
              status: { not: 'CANCELLED' },
              createdAt: dateFilter
            },
            _sum: { orderTotal: true }
          });
          currentValue = result._sum.orderTotal ?? 0;

        } else if (goal.type === 'SALES_COUNT') {
          currentValue = await prisma.affiliateSale.count({
            where: {
              affiliateId: affiliate.id,
              status: { not: 'CANCELLED' },
              createdAt: dateFilter
            }
          });

        } else if (goal.type === 'CLICKS_COUNT') {
          currentValue = await prisma.affiliateClick.count({
            where: {
              affiliateId: affiliate.id,
              createdAt: dateFilter
            }
          });

        } else if (goal.type === 'COMMISSION_AMOUNT') {
          const result = await prisma.affiliateSale.aggregate({
            where: {
              affiliateId: affiliate.id,
              status: { not: 'CANCELLED' },
              createdAt: dateFilter
            },
            _sum: { commissionAmount: true }
          });
          currentValue = result._sum.commissionAmount ?? 0;
        }

        const progressPercent = Math.min(
          Math.round((currentValue / goal.targetValue) * 100),
          100
        );
        const isCompleted = progressPercent >= 100;
        const isExpired = now > goal.endDate;

        return {
          ...goal,
          currentValue,
          progressPercent,
          isCompleted,
          isExpired
        };
      })
    );

    return NextResponse.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
