import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET: Listar transações da conta do vendedor
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // SALE, WITHDRAWAL, etc
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: { account: true }
    });

    if (!seller?.account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Construir filtro
    const where: any = {
      accountId: seller.account.id
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59');
      }
    }

    // Buscar transações
    const [transactions, total] = await Promise.all([
      prisma.sellerAccountTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.sellerAccountTransaction.count({ where })
    ]);

    // Calcular estatísticas do período
    const stats = await prisma.sellerAccountTransaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: true
    });

    return NextResponse.json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        description: t.description,
        reference: t.reference,
        referenceType: t.referenceType,
        status: t.status,
        createdAt: t.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats.reduce((acc: any, s) => {
        acc[s.type] = {
          total: s._sum.amount || 0,
          count: s._count
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
