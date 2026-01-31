import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Listar todas as contas de vendedores (Admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const kycStatus = searchParams.get('kycStatus');
    const search = searchParams.get('search');

    // Construir filtro
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (kycStatus) {
      where.kycStatus = kycStatus;
    }

    if (search) {
      where.OR = [
        { accountNumber: { contains: search } },
        { seller: { storeName: { contains: search } } },
        { seller: { user: { name: { contains: search } } } },
        { seller: { user: { email: { contains: search } } } }
      ];
    }

    const [accounts, total] = await Promise.all([
      prisma.sellerAccount.findMany({
        where,
        include: {
          seller: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          },
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.sellerAccount.count({ where })
    ]);

    // Estatísticas gerais
    const stats = await prisma.sellerAccount.aggregate({
      _sum: {
        balance: true,
        blockedBalance: true,
        totalReceived: true,
        totalWithdrawn: true
      },
      _count: true
    });

    const statusCounts = await prisma.sellerAccount.groupBy({
      by: ['status'],
      _count: true
    });

    const kycCounts = await prisma.sellerAccount.groupBy({
      by: ['kycStatus'],
      _count: true
    });

    return NextResponse.json({
      accounts: accounts.map(a => ({
        id: a.id,
        accountNumber: a.accountNumber,
        status: a.status,
        kycStatus: a.kycStatus,
        balance: a.balance,
        blockedBalance: a.blockedBalance,
        totalReceived: a.totalReceived,
        totalWithdrawn: a.totalWithdrawn,
        seller: {
          id: a.seller.id,
          storeName: a.seller.storeName,
          userName: a.seller.user.name,
          userEmail: a.seller.user.email
        },
        transactionsCount: a._count.transactions,
        createdAt: a.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalBalance: stats._sum.balance || 0,
        totalBlocked: stats._sum.blockedBalance || 0,
        totalReceived: stats._sum.totalReceived || 0,
        totalWithdrawn: stats._sum.totalWithdrawn || 0,
        totalAccounts: stats._count,
        byStatus: statusCounts.reduce((acc: any, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {}),
        byKyc: kycCounts.reduce((acc: any, k) => {
          acc[k.kycStatus] = k._count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
