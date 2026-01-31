import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET: Listar transações de cashback do cliente
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const cashback = await prisma.customerCashback.findUnique({
      where: { userId: session.user.id }
    });

    if (!cashback) {
      return NextResponse.json({
        transactions: [],
        pagination: { page: 1, limit, total: 0, pages: 0 }
      });
    }

    // Construir filtro
    const where: any = {
      cashbackId: cashback.id
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const [transactions, total] = await Promise.all([
      prisma.cashbackTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.cashbackTransaction.count({ where })
    ]);

    return NextResponse.json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        description: t.description,
        orderId: t.orderId,
        status: t.status,
        expiresAt: t.expiresAt,
        availableAt: t.availableAt,
        createdAt: t.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
