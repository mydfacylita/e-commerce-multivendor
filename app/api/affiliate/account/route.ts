import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
      include: {
        account: {
          select: {
            balance: true,
            totalReceived: true,
            totalWithdrawn: true,
            minWithdrawalAmount: true
          }
        }
      }
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    if (!affiliate.account) {
      return NextResponse.json({ error: 'Conta MYD não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      account: affiliate.account
    });
  } catch (error) {
    console.error('Erro ao buscar conta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
